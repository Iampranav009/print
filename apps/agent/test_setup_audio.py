from __future__ import annotations
import json
import sys
import threading
import unittest
from unittest.mock import Mock, patch

from audio import announcer as audio
import agent


class AgentRegressionTests(unittest.TestCase):
    def test_heartbeat_applies_dashboard_printer_and_clears_old_capabilities(self):
        response = Mock()
        response.json.return_value = {"printerConfig": {"os_printer_name": "New printer"}}
        with patch.object(agent, "PRINTER_NAME", "Old printer"), patch.object(agent, "_last_known_caps", {"color": True}), patch.object(agent, "get_discovered_printers", return_value=[]), patch.object(agent.requests, "post", return_value=response) as post:
            agent.heartbeat()
            self.assertEqual(agent.PRINTER_NAME, "New printer")
            self.assertIsNone(agent._last_known_caps)
            self.assertEqual(post.call_args.kwargs["json"]["discoveredPrinters"], [])
            self.assertEqual(post.call_args.kwargs["json"]["printerStatus"], "offline")

    def test_network_failure_preserves_audio_settings(self):
        with patch.object(audio, "configure") as configure:
            agent._apply_sound_settings({})
            configure.assert_not_called()

    def test_money_keeps_paise(self):
        with patch.object(audio, "_announce") as announce:
            audio.announce_payment_received(1050, 1)
            self.assertEqual(announce.call_args.kwargs["amount"], "10.5")

    def test_windows_speech_passes_data_separately_and_bounds_execution(self):
        with patch.object(audio.subprocess, "run", return_value=Mock(returncode=0)) as run:
            engine = audio.WindowsSpeechEngine(35)
            engine.speak("Payment received. 10 rupees.")
            engine.speak("Payment failed.")
            self.assertEqual(run.call_count, 2)
            self.assertEqual(json.loads(run.call_args.kwargs["input"])["volume"], 35)
            self.assertEqual(run.call_args.kwargs["timeout"], 30)

    def test_worker_recovers_from_speech_error_and_never_beeps(self):
        calls = []
        class FakeEngine(audio.TtsEngine):
            def speak(self, text):
                calls.append((text, threading.current_thread().name))
                if len(calls) == 1:
                    raise RuntimeError("temporary device failure")
        with patch.object(audio, "_play_chime") as chime:
            announcer = audio.Announcer(tts=FakeEngine())
            announcer.enqueue("first")
            announcer.enqueue("second")
            announcer.shutdown()
            self.assertEqual([c[0] for c in calls], ["first", "second"])
            self.assertTrue(all(c[1] == "audio-worker" for c in calls))
            chime.assert_not_called()

    def test_volume_and_mute_apply_without_restart(self):
        engine = Mock(spec=audio.TtsEngine)
        engine.available = True
        announcer = audio.Announcer(tts=engine)
        announcer.set_volume(25)
        announcer._play(audio.Announcement("quiet"))
        engine.set_volume.assert_called_with(25)
        announcer.set_volume(0)
        announcer._play(audio.Announcement("muted"))
        engine.speak.assert_called_once_with("quiet")
        announcer.shutdown()


if __name__ == "__main__":
    unittest.main()
