"""Paid-job handoff must not lose a completed status during a network drop."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import agent


class QueueStatusTests(unittest.TestCase):
    def test_completed_status_is_retried_after_network_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            pending = Path(directory) / "pending.json"
            failed = Mock()
            failed.raise_for_status.side_effect = RuntimeError("offline")
            accepted = Mock()
            with patch.object(agent, "CONFIG_DIR", Path(directory)), \
                 patch.object(agent, "PENDING_STATUS_FILE", pending), \
                 patch.object(agent.requests, "post", side_effect=[failed, accepted]) as post:
                self.assertFalse(agent.update_status("job-a", "printed"))
                self.assertTrue(pending.exists())
                self.assertTrue(agent.flush_pending_status())
                self.assertFalse(pending.exists())
                self.assertEqual(post.call_count, 2)

    def test_agent_does_not_fetch_another_job_until_completion_is_accepted(self):
        with patch.object(agent, "flush_pending_status", return_value=False), \
             patch.object(agent.requests, "get") as get:
            agent.poll_and_print()
            get.assert_not_called()


if __name__ == "__main__":
    unittest.main()
