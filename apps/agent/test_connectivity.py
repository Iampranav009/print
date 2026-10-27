import json
import types
import unittest
from unittest.mock import Mock, patch

import agent
from printing import discovery


class ConnectivityTests(unittest.TestCase):
    def test_window_shows_saved_routes_and_connection_loss(self):
        import tkinter as tk
        import desktop
        root = tk.Tk()
        root.withdraw()
        try:
            with patch.object(desktop, "load_settings", return_value={}):
                window = desktop.HimmerWindow(root)
            window.settings = {"SHOP_NAME": "Test shop"}
            window.events.put(("connection", {"connected": True, "printerOnline": True, "printerConfig": {"bw_os_printer_name": "Laser printer", "color_os_printer_name": "Color printer", "mode": "real"}}))
            window.pump()
            self.assertIn("Test shop", window.connection_status.get())
            self.assertIn("B&W: Laser printer", window.assignment_status.get())
            self.assertIn("Color: Color printer", window.assignment_status.get())
            window.events.put(("connection", {"connected": False}))
            window.pump()
            self.assertIn("connection lost", window.connection_status.get())
            self.assertIn("cannot be confirmed", window.assignment_status.get())
        finally:
            root.destroy()

    def test_discovery_failure_still_reports_computer_connection(self):
        response = Mock()
        response.json.return_value = {"printerConfig": {"os_printer_name": "Shop printer"}, "printerOnline": False}
        callback = Mock()
        with patch.object(agent, "get_discovered_printers", side_effect=RuntimeError("Spooler stopped")), patch.object(agent.requests, "post", return_value=response) as post, patch.object(agent, "CONNECTION_STATUS_HANDLER", callback), patch.object(agent, "PRINTER_NAME", ""):
            agent.heartbeat()
            self.assertTrue(post.call_args.kwargs["json"]["discoveryError"])
            self.assertNotIn("discoveredPrinters", post.call_args.kwargs["json"])
            self.assertTrue(callback.call_args.args[0]["connected"])
            self.assertTrue(callback.call_args.args[0]["discoveryError"])
            self.assertEqual(agent.PRINTER_NAME, "Shop printer")

    def test_network_failure_marks_desktop_disconnected(self):
        callback = Mock()
        with patch.object(agent, "get_discovered_printers", return_value=[]), patch.object(agent.requests, "post", side_effect=RuntimeError("Offline")), patch.object(agent, "CONNECTION_STATUS_HANDLER", callback):
            self.assertEqual(agent.heartbeat(), {})
            callback.assert_called_once_with({"connected": False})

    def test_windows_discovery_preserves_offline_and_default(self):
        rows = [{"Name": "Ready printer", "Default": True, "PrinterStatus": 3, "WorkOffline": False}, {"Name": "Unplugged", "PrinterStatus": 7, "WorkOffline": True}]
        with patch.object(discovery.sys, "platform", "win32"), patch.object(discovery.sys, "getwindowsversion", return_value=types.SimpleNamespace(major=10)), patch.object(discovery.subprocess, "run", return_value=Mock(returncode=0, stdout=json.dumps(rows))):
            printers = discovery.get_discovered_printers()
            self.assertTrue(printers[0]["available"])
            self.assertTrue(printers[0]["isDefault"])
            self.assertFalse(printers[1]["available"])


if __name__ == "__main__":
    unittest.main()
