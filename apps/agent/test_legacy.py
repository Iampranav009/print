from __future__ import annotations
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch, MagicMock
import windows_setup
from printing import discovery
from audio.announcer import WindowsSpeechEngine

class LegacyTests(unittest.TestCase):
    def test_discovery_uses_os_spooler_on_windows7(self):
        spooler=types.SimpleNamespace(PRINTER_ENUM_LOCAL=2,PRINTER_ENUM_CONNECTIONS=4,error=OSError,
            GetDefaultPrinter=lambda:'Shop printer', EnumPrinters=lambda *args:[{'pPrinterName':'Shop printer','pDriverName':'Driver','Status':0}])
        with patch.object(sys,'getwindowsversion',return_value=types.SimpleNamespace(major=6)),patch.dict(sys.modules,{'win32print':spooler}),patch.object(discovery.subprocess,'run') as run:
            printers=discovery.get_discovered_printers()
            self.assertEqual(printers[0]['name'],'Shop printer')
            self.assertTrue(printers[0]['isDefault'])
            run.assert_not_called()

    def test_logon_registration_is_per_user_and_quotes_path(self):
        registry=MagicMock()
        with patch.object(windows_setup,'legacy_windows',return_value=True),patch.dict(sys.modules,{'winreg':registry}),patch.object(windows_setup,'powershell') as powershell:
            windows_setup.register_startup(Path('C:/Shop PC/PrintBuddy.exe'))
            command=registry.SetValueEx.call_args[0][-1]
            self.assertIn('"',command)
            self.assertIn('--background',command)
            self.assertEqual(registry.CreateKey.call_args[0][0],registry.HKEY_CURRENT_USER)
            powershell.assert_not_called()

    def test_bundled_engine_needs_no_download(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);bundle=root/'bundle';bundle.mkdir();(bundle/'SumatraPDF.exe').write_bytes(b'test-engine')
            with patch.object(windows_setup,'CONFIG_DIR',root/'install'),patch.object(sys,'_MEIPASS',str(bundle),create=True),patch.object(windows_setup.requests,'get') as get:
                self.assertEqual(windows_setup.ensure_print_support().read_bytes(),b'test-engine')
                get.assert_not_called()

    def test_voice_does_not_require_powershell_json_cmdlets(self):
        with patch('audio.announcer.subprocess.run',return_value=types.SimpleNamespace(returncode=0)) as run:
            WindowsSpeechEngine().speak("Payment received. 10 rupees. 'quoted'")
            script=run.call_args[0][0][-1]
            self.assertIn('SAPI.SpVoice',script)
            self.assertNotIn('ConvertFrom-Json',script)
            self.assertNotIn("'quoted'",script)

if __name__=='__main__':unittest.main()
