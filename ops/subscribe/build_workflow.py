#!/usr/bin/env python3
"""Builds workflow_subscribe.json ("Arena site: subscribe") from nodes/*.js.

    python ops/subscribe/build_workflow.py

The workflow is the back end of the site's subscription form (worker/subscribe.ts). One webhook, three actions:
  subscribe    find or create the person in Twenty (by e-mail code `cid`, else by e-mail), status PENDING, tag SUBSCRIBER,
               then the confirmation letter through the Brevo API (main domain, warm stream)
  confirm      token -> status CONFIRMED
  unsubscribe  token -> status UNSUBSCRIBED
n8n holds the live copy; this file is the reviewed source. Credentials are referenced by id only.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
TWENTY = "https://crm.arenasoldout.com/rest"
CRED_TWENTY = {"httpHeaderAuth": {"id": "UIbE9X3GR29KtVxn", "name": "Twenty CRM API"}}
CRED_HOOK = {"httpHeaderAuth": {"id": "pOK4dJv0E29U6JRR", "name": "Arena site subscribe token"}}
CRED_BREVO = {"sendInBlueApi": {"id": "s3JzTGPvNzwudf42", "name": "Brevo API"}}

nodes, conns = [], {}


def code(name, file, pos):
    nodes.append({"id": name.lower().replace(" ", "-"), "name": name, "type": "n8n-nodes-base.code", "typeVersion": 2, "position": pos,
                  "parameters": {"jsCode": (HERE / "nodes" / file).read_text(encoding="utf-8")}})


def twenty(name, method, url, pos, body=None, cont=False):
    p = {"method": method, "url": url, "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "options": {"timeout": 30000}}
    if body is not None:
        p.update({"sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": body})
    n = {"id": name.lower().replace(" ", "-").replace(":", ""), "name": name, "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": pos,
         "retryOnFail": True, "maxTries": 3, "waitBetweenTries": 2000, "parameters": p, "credentials": CRED_TWENTY}
    if cont:
        n["onError"] = "continueRegularOutput"
    nodes.append(n)


def switch(name, expr, values, pos):
    rules = []
    for v in values:
        rules.append({"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
                                     "conditions": [{"id": name + v, "leftValue": expr, "rightValue": v, "operator": {"type": "string", "operation": "equals"}}],
                                     "combinator": "and"}, "renameOutput": True, "outputKey": v})
    nodes.append({"id": name.lower().replace(" ", "-"), "name": name, "type": "n8n-nodes-base.switch", "typeVersion": 3.2, "position": pos,
                  "parameters": {"rules": {"values": rules}, "options": {}}})


def respond(name, body, code_expr, pos):
    nodes.append({"id": name.lower().replace(" ", "-"), "name": name, "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": pos,
                  "parameters": {"respondWith": "json", "responseBody": body, "options": {"responseCode": code_expr}}})


def link(a, b, out=0):
    conns.setdefault(a, {"main": []})
    while len(conns[a]["main"]) <= out:
        conns[a]["main"].append([])
    conns[a]["main"][out].append({"node": b, "type": "main", "index": 0})


nodes.append({"id": "webhook", "name": "Site subscribe", "webhookId": "arena-site-subscribe", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 300],
              "parameters": {"httpMethod": "POST", "path": "arena-site-subscribe", "authentication": "headerAuth", "responseMode": "responseNode", "options": {}},
              "credentials": CRED_HOOK})
code("Prepare", "prepare.js", [240, 300])
switch("Route", "={{ $json.route }}", ["subscribe", "token", "bad"], [480, 300])

# subscribe branch
twenty("Twenty: send by cid", "GET", "={{ '" + TWENTY + "/outreachSends?limit=1&filter=' + encodeURIComponent('contactCode[eq]:\"' + ($json.cid || 'none') + '\"') }}", [720, 100], cont=True)
twenty("Twenty: person by email", "GET", "={{ '" + TWENTY + "/people?limit=5&filter=' + encodeURIComponent('emails.primaryEmail[ilike]:\"' + $('Prepare').first().json.email + '\"') }}", [960, 100])
code("Pick", "pick.js", [1200, 100])
switch("Need card", "={{ $json.needFetch }}", ["yes", "no"], [1440, 100])
twenty("Twenty: card by id", "GET", "={{ '" + TWENTY + "/people/' + $json.fetchId }}", [1680, 0], cont=True)
code("Build", "build.js", [1920, 100])
switch("Mode", "={{ $json.mode }}", ["create", "update", "already"], [2160, 100])
twenty("Twenty: create person", "POST", TWENTY + "/people", [2400, 0], body="={{ JSON.stringify($json.body) }}")
twenty("Twenty: update person", "PATCH", "={{ '" + TWENTY + "/people/' + $json.id }}", [2400, 200], body="={{ JSON.stringify($json.body) }}")
code("Mail", "mail.js", [2640, 100])
nodes.append({"id": "brevo", "name": "Brevo: confirmation letter", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [2880, 100],
              "parameters": {"method": "POST", "url": "https://api.brevo.com/v3/smtp/email", "authentication": "predefinedCredentialType", "nodeCredentialType": "sendInBlueApi",
                             "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.brevo) }}", "options": {"timeout": 30000}},
              "credentials": CRED_BREVO})
respond("Respond OK", "={{ JSON.stringify({ ok: true }) }}", 200, [3120, 100])

# confirm / unsubscribe branch
twenty("Twenty: person by token", "GET", "={{ '" + TWENTY + "/people?limit=3&filter=' + encodeURIComponent('subscriptionToken[eq]:\"' + $json.token + '\"') }}", [720, 500])
code("Decide", "decide.js", [960, 500])
switch("Patch needed", "={{ $json.patch }}", ["yes", "no"], [1200, 500])
twenty("Twenty: change status", "PATCH", "={{ '" + TWENTY + "/people/' + $json.id }}", [1440, 440], body="={{ JSON.stringify($json.change) }}")
respond("Respond result", "={{ JSON.stringify($('Decide').first().json.body) }}", "={{ $('Decide').first().json.code }}", [1680, 500])
respond("Respond bad", "={{ JSON.stringify({ error: 'invalid' }) }}", 400, [720, 700])

link("Site subscribe", "Prepare"); link("Prepare", "Route")
link("Route", "Twenty: send by cid", 0); link("Route", "Twenty: person by token", 1); link("Route", "Respond bad", 2)
link("Twenty: send by cid", "Twenty: person by email"); link("Twenty: person by email", "Pick"); link("Pick", "Need card")
link("Need card", "Twenty: card by id", 0); link("Need card", "Build", 1); link("Twenty: card by id", "Build"); link("Build", "Mode")
link("Mode", "Twenty: create person", 0); link("Mode", "Twenty: update person", 1); link("Mode", "Respond OK", 2)
link("Twenty: create person", "Mail"); link("Twenty: update person", "Mail"); link("Mail", "Brevo: confirmation letter"); link("Brevo: confirmation letter", "Respond OK")
link("Twenty: person by token", "Decide"); link("Decide", "Patch needed")
link("Patch needed", "Twenty: change status", 0); link("Patch needed", "Respond result", 1); link("Twenty: change status", "Respond result")

wf = {"name": "Arena site: subscribe", "nodes": nodes, "connections": conns,
      "settings": {"executionOrder": "v1", "timezone": "Europe/Tallinn", "executionTimeout": 60, "errorWorkflow": "BXvWxtK4HirW0S2C", "saveDataErrorExecution": "all", "saveDataSuccessExecution": "none"}}
out = HERE / "workflow_subscribe.json"
out.write_text(json.dumps(wf, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", out, len(nodes), "nodes")
