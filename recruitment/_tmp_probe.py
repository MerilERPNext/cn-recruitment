from recruitment.recruitment import tpo_portal


def run():
    for invite in ("CINV-2026-1301", "CINV-2026-0735"):
        data = tpo_portal.get_drive_candidates(invite)
        print(f"=== {invite} — {data['campus_invite_name']} :: {data['summary']}")
        for c in data["candidates"][:5]:
            apps = "; ".join(
                f"{a['job_title']} [{a['status']} / {a['stage']}]" for a in c["applications"]
            ) or "-"
            spot = " (spot)" if c["spot_registered"] else ""
            print(f"   {c['state']:11}{spot:7} {c['full_name'][:24]:24} {apps}")
