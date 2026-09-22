from __future__ import annotations
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import agent
import local_settings
from pairing import parse_link, redeem_link
from printing.windows_printer import print_windows


class DesktopTests(unittest.TestCase):
    def test_pairing_link_rejects_untrusted_hosts_and_permanent_credentials(self):
        token = "a" * 64
        self.assertEqual(parse_link(f"https://print-kro-five.vercel.app/agent/connect#{token}")[1], token)
        for link in [f"http://print-kro-five.vercel.app/agent/connect#{token}",
                     f"https://evil.example/agent/connect#{token}",
                     f"https://print-kro-five.vercel.app.evil.example/agent/connect#{token}",
                     f"https://user@print-kro-five.vercel.app/agent/connect#{token}",
                     "https://print-kro-five.vercel.app/agent/connect#short"]:
            with self.assertRaises(ValueError):
                parse_link(link)

    def test_expired_link_returns_actionable_message(self):
        result = Mock(status_code=410)
        result.json.return_value = {"error": "Link expired. Generate another."}
        with patch("pairing.requests.post", return_value=result) as post:
            with self.assertRaisesRegex(RuntimeError, "expired"):
                redeem_link("https://print-kro-five.vercel.app/agent/connect#" + "a" * 64)
            self.assertFalse(post.call_args.kwargs["allow_redirects"])

    @unittest.skipUnless(sys.platform == "win32", "Windows credential protection")
    def test_saved_credential_is_encrypted_and_survives_restart(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(local_settings, "CONFIG_DIR", Path(directory)):
            local_settings.save_settings({"AGENT_TOKEN": "test-secret-only", "SHOP_ID": "test-shop"})
            content = (Path(directory) / "config.json").read_text()
            self.assertNotIn("test-secret-only", content)
            self.assertIn("AGENT_TOKEN_DPAPI", content)
            self.assertEqual(local_settings.load_settings()["AGENT_TOKEN"], "test-secret-only")

    def test_each_job_uses_its_assigned_printer(self):
        with patch.object(agent, "PRINTER_NAME", "Old default"), patch.object(agent, "SIMULATE_FAIL", "none"), patch.object(agent.sys, "platform", "win32"), patch.object(agent, "print_windows", return_value=(True, None)) as printer:
            agent.print_real("test.pdf", {"color": True, "osPrinterName": "Color printer"})
            agent.print_real("test.pdf", {"color": False, "osPrinterName": "B&W printer"})
            self.assertEqual([c.args[0] for c in printer.call_args_list], ["Color printer", "B&W printer"])
            self.assertFalse(agent.print_real("test.pdf", {"osPrinterName": None})[0])
            self.assertEqual(printer.call_count, 2)  # No fallback to an unrelated printer.

    def test_windows_color_setting_is_explicit(self):
        with patch("printing.windows_printer.get_sumatra_executable", return_value="SumatraPDF.exe"), patch("printing.windows_printer.subprocess.run", return_value=Mock(returncode=0)) as run:
            for color, expected in [(True, "color"), (False, "monochrome")]:
                print_windows("Chosen printer", "test.pdf", {"color": color})
                args = run.call_args.args[0]
                self.assertEqual(args[args.index("-print-to") + 1], "Chosen printer")
                self.assertIn(expected, args[args.index("-print-settings") + 1].split(","))

    def test_no_printer_selected_does_not_consume_paid_job(self):
        response = Mock()
        response.json.return_value = {"job": {"id": "test", "status": "dispatched", "osPrinterName": None}}
        with patch.object(agent, "PRINT_MODE", "real"), patch.object(agent.requests, "get", return_value=response), patch.object(agent, "update_status") as update:
            agent.poll_and_print()
            update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
