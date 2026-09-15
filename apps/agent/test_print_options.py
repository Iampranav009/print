import unittest
from unittest.mock import patch
from printing.windows_printer import print_windows
from printing.cups_printer import build_cups_options
class PrintOptionsTests(unittest.TestCase):
    def test_windows_explicit_settings(self):
        with patch('printing.windows_printer.subprocess.run') as run:
            run.return_value.returncode=0
            self.assertTrue(print_windows('Test Printer','test.pdf',{'copies':2,'duplex':False,'orientation':'portrait','scaling':'none'})[0])
            settings=run.call_args.args[0][4]
            for token in ['2x','simplex','portrait','noscale','monochrome','paper=A4']: self.assertIn(token,settings.split(','))
    def test_windows_duplex(self):
        with patch('printing.windows_printer.subprocess.run') as run:
            run.return_value.returncode=0
            self.assertTrue(print_windows('Test','test.pdf',{'color':True,'duplex':True,'duplexEdge':'short','orientation':'landscape','scaling':'fit-to-page'})[0])
            settings=run.call_args.args[0][4]
            for token in ['color','duplexshort','landscape','fit']: self.assertIn(token,settings.split(','))
    def test_unsupported_not_silently_printed(self):
        with patch('printing.windows_printer.subprocess.run') as run:
            self.assertFalse(print_windows('Test','test.pdf',{'numberUp':2})[0])
            self.assertFalse(print_windows('Test','test.pdf',{'quality':'high'})[0])
            run.assert_not_called()
    def test_cups_explicit_defaults(self):
        options=build_cups_options({})
        self.assertEqual(options['sides'],'one-sided')
        self.assertEqual(options['orientation-requested'],'3')
        self.assertEqual(options['print-scaling'],'none')
    def test_cups_selections(self):
        options=build_cups_options({'quality':'high','duplex':True,'numberUp':6,'orientation':'landscape','scaling':'shrink-to-fit'})
        self.assertEqual(options['print-quality'],'5')
        self.assertEqual(options['number-up'],'6')
        self.assertEqual(options['print-scaling'],'auto-fit')
if __name__=='__main__': unittest.main()
