#!/usr/bin/env python3
"""Fields the e-mail subscription flow needs on a Twenty person (site form "Subscribe", warm stream).

    python ops/subscribe/subscribe_schema.py            # dry run: prints what is missing, changes nothing
    python ops/subscribe/subscribe_schema.py --apply    # creates the missing fields and the SUBSCRIBER tag option

Idempotent. Same shape as arena_crm/ops/n8n/outreach/outreach_schema.py. The key is read from
arena-site-secrets/crm-pilot.env and is never printed.

Fields (person): subscriptionStatus PENDING|CONFIRMED|UNSUBSCRIBED, subscriptionEmail (the address typed in the form, it may differ
from the card's primary e-mail when the card was found by the e-mail code `cid`), subscriptionSource (popup|footer),
subscriptionLanguage (page language), subscriptionConsentAt, subscriptionConsentText (version of the consent line),
subscriptionConfirmedAt, subscriptionUnsubscribedAt, subscriptionToken (random, set by the Worker; confirms and unsubscribes),
subscriptionUtm, subscriptionPage. The tag SUBSCRIBER is added to the multi-select `tags`.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ENV = Path(r"C:\Projects\arena-site-secrets/crm-pilot.env")
BASE = "https://crm.arenasoldout.com"
COL = ["blue", "green", "orange", "purple", "turquoise", "pink", "yellow", "sky", "red", "gray"]
STATUS = ["PENDING", "CONFIRMED", "UNSUBSCRIBED"]
FIELDS = [
    ("subscriptionEmail", "Subscription e-mail", "TEXT"), ("subscriptionSource", "Subscription source", "TEXT"),
    ("subscriptionLanguage", "Subscription language", "TEXT"), ("subscriptionConsentAt", "Consent at", "DATE_TIME"),
    ("subscriptionConsentText", "Consent text version", "TEXT"), ("subscriptionConfirmedAt", "Subscription confirmed at", "DATE_TIME"),
    ("subscriptionUnsubscribedAt", "Unsubscribed at", "DATE_TIME"), ("subscriptionToken", "Subscription token", "TEXT"),
    ("subscriptionUtm", "Subscription UTM", "TEXT"), ("subscriptionPage", "Subscription page", "TEXT"),
]


def key():
    m = re.search(r"^TWENTY_API_KEY=(.*)$", ENV.read_text(encoding="utf-8"), re.M)
    if not m:
        sys.exit("TWENTY_API_KEY not found")
    return m.group(1).strip().strip('"').strip("'")


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + key(), "Content-Type": "application/json", "User-Agent": "ArenaSubscribeSchema/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read()
        return json.loads(raw) if raw else {}


def add_options(field, values, apply):
    existing = field.get("options") or []
    have = {x["value"] for x in existing}
    add = [v for v in values if v not in have]
    print(("add " if apply else "missing ") + field["name"] + " options: " + (", ".join(add) or "none"))
    if apply and add:
        options = list(existing)
        for v in add:
            options.append({"label": v.replace("_", " ").capitalize(), "value": v, "color": COL[len(options) % len(COL)], "position": len(options)})
        call("PATCH", "/rest/metadata/fields/" + field["id"], {"options": options})


def main():
    apply = "--apply" in sys.argv
    d = call("GET", "/rest/metadata/objects?limit=500")["data"]
    d = d.get("objects", d) if isinstance(d, dict) else d
    person = next(o for o in d if o["nameSingular"] == "person")
    have = {f["name"] for f in person["fields"]}
    for name, label, ftype in FIELDS:
        if name not in have:
            print(("create " if apply else "missing ") + "person." + name, ftype)
            if apply:
                call("POST", "/rest/metadata/fields", {"objectMetadataId": person["id"], "name": name, "label": label, "type": ftype, "icon": "IconMail"})
    if "subscriptionStatus" not in have:
        print(("create " if apply else "missing ") + "person.subscriptionStatus SELECT")
        if apply:
            call("POST", "/rest/metadata/fields", {"objectMetadataId": person["id"], "name": "subscriptionStatus", "label": "Subscription status", "type": "SELECT", "icon": "IconMail",
                                                    "options": [{"label": v.capitalize(), "value": v, "color": COL[i], "position": i} for i, v in enumerate(STATUS)]})
    if apply:  # refresh to read the ids of what was just created
        d = call("GET", "/rest/metadata/objects?limit=500")["data"]
        d = d.get("objects", d) if isinstance(d, dict) else d
        person = next(o for o in d if o["nameSingular"] == "person")
    tags = next(f for f in person["fields"] if f["name"] == "tags")
    add_options(tags, ["SUBSCRIBER"], apply)
    send = next(o for o in d if o["nameSingular"] == "outreachSend")
    print("outreachSend relation fields:", [f["name"] for f in send["fields"] if f["type"] == "RELATION" and not f.get("isSystem")])


if __name__ == "__main__":
    main()
