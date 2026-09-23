"""PrintBuddy's Windows setup window and background tray app."""
from __future__ import annotations
import json
import os
from pathlib import Path
import queue
import sys
import threading
import tempfile
import tkinter as tk
from tkinter import ttk, messagebox
import webbrowser
import requests
from local_settings import CONFIG_DIR, load_settings, save_settings
from pairing import parse_link, redeem_link, TRUSTED_HOST
from printing.discovery import get_discovered_printers


class PrintBuddyWindow:
    def __init__(self, root: tk.Tk, background: bool = False):
        self.root = root
        self.events = queue.Queue()
        self.printers = []
        self.scan_busy = False
        self.connect_busy = False
        self.stop_event = threading.Event()
        self.tray = None
        self.runtime = False
        self.exit_code = 0
        self.settings = {}
        self.settings_error = None
        self.cash_windows = {}
        try:
            self.settings = load_settings()
        except Exception:
            self.settings_error = "Saved connection could not be opened. Paste a new connection link."
        root.title("PrintBuddy")
        root.geometry("740x720")
        root.minsize(700, 680)
        root.configure(bg="#f5f5fa")
        ttk.Style().theme_use("clam")
        ttk.Style().configure("TButton", padding=9)
        frame = ttk.Frame(root, padding=26)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="PrintBuddy", font=("Segoe UI", 26, "bold")).pack(anchor="w")
        ttk.Label(frame, text="Your shop, ready to print.", font=("Segoe UI", 11)).pack(anchor="w", pady=(0, 18))
        ttk.Label(frame, text="Printers on this computer", font=("Segoe UI", 12, "bold")).pack(anchor="w")
        self.printer_list = tk.Listbox(frame, height=5, font=("Segoe UI", 10), relief="flat", bd=0, selectbackground="#5036ed")
        self.printer_list.pack(fill="x", pady=8)
        self.scan_status = tk.StringVar(value="Finding printers…")
        ttk.Label(frame, textvariable=self.scan_status, wraplength=600).pack(anchor="w")
        printer_actions = ttk.Frame(frame)
        printer_actions.pack(anchor="w", pady=(7, 15))
        ttk.Button(printer_actions, text="Refresh printers", command=self.scan).pack(side="left")
        ttk.Button(printer_actions, text="Print a test page", command=self.test_printer).pack(side="left", padx=8)
        ttk.Label(frame, text="Shop connection link", font=("Segoe UI", 11, "bold")).pack(anchor="w")
        self.link = tk.StringVar()
        self.entry = ttk.Entry(frame, textvariable=self.link, font=("Segoe UI", 10))
        self.entry.pack(fill="x", pady=8)
        ttk.Label(frame, text="Copy the connection link from your dashboard and paste it here.", wraplength=600).pack(anchor="w")
        self.consent = tk.BooleanVar(value=False)
        ttk.Checkbutton(frame, text="Install PrintBuddy and PDF printing support; start after Windows sign-in.", variable=self.consent).pack(anchor="w", pady=12)
        row = ttk.Frame(frame)
        row.pack(fill="x")
        self.connect_button = ttk.Button(row, text="Install and connect", command=self.connect)
        self.connect_button.pack(side="left")
        ttk.Button(row, text="Open dashboard", command=self.dashboard).pack(side="left", padx=8)
        ttk.Button(row, text="Test speaker", command=self.test_speaker).pack(side="left")
        self.status = tk.StringVar(value=self.settings_error or "No printer selection is needed to find printers.")
        ttk.Label(frame, textvariable=self.status, wraplength=600, font=("Segoe UI", 10)).pack(anchor="w", pady=18)
        ttk.Label(frame, text="Keep this computer awake and signed in. You can close the dashboard.\nPrinting uses your installed Windows printer drivers.", wraplength=600).pack(anchor="w")
        root.protocol("WM_DELETE_WINDOW", self.close)
        root.after(100, self.pump)
        root.after(10, self.scan)
        installed = Path(sys.executable).resolve() == (CONFIG_DIR / "PrintBuddy.exe").resolve()
        if self.settings.get("AGENT_TOKEN") and (installed or background):
            self.start_runtime()
            if background:
                root.withdraw()

    def dashboard(self):
        webbrowser.open(f"https://{TRUSTED_HOST}/vendor/printer")

    def scan(self):
        if self.scan_busy:
            return
        self.scan_busy = True
        def work():
            try:
                self.events.put(("printers", get_discovered_printers()))
            except Exception as error:
                self.events.put(("scan_error", str(error)))
        threading.Thread(target=work, daemon=True).start()

    def connect(self):
        if self.runtime:
            messagebox.showinfo("Already connected", "This computer is connected. Quit PrintBuddy from the tray before changing shops.")
            return
        if self.connect_busy:
            return
        try:
            parse_link(self.link.get())
        except ValueError as error:
            self.status.set(str(error)); return
        if not self.consent.get():
            self.status.set("Tick the installation permission above to continue."); return
        self.connect_busy = True
        self.connect_button.configure(state="disabled")
        self.status.set("Installing PrintBuddy and preparing PDF printing…")
        link = self.link.get()
        def work():
            try:
                from windows_setup import install_app, register_startup, start_installed
                executable = install_app()
                # Register first so an OS permission failure does not consume the one-time link.
                register_startup(executable)
                settings = redeem_link(link)
                settings["SUMATRAPDF_PATH"] = str(CONFIG_DIR / "SumatraPDF.exe")
                save_settings(settings)
                start_installed()
                # Publish discovery immediately, even before a print destination is chosen.
                try:
                    requests.post(f"{settings['PRINTBUDDY_API_BASE']}/api/agent/heartbeat",
                                  headers={"Authorization": f"Bearer {settings['AGENT_TOKEN']}"},
                                  json={"discoveredPrinters": get_discovered_printers()}, timeout=15).raise_for_status()
                except Exception:
                    pass  # Saved connection is valid; the background heartbeat retries.
                self.events.put(("connected", settings))
            except Exception as error:
                # Never display request objects or connection URLs containing credentials.
                text = str(error) if not isinstance(error, requests.RequestException) else "Could not reach PrintBuddy. Check the internet connection, then try again. If your link was used, create a new one."
                self.events.put(("error", text))
        threading.Thread(target=work, daemon=True).start()

    def test_speaker(self):
        def work():
            try:
                from audio.announcer import WindowsSpeechEngine
                WindowsSpeechEngine(70).speak("PrintBuddy is ready. Payment announcements will play here.")
                self.events.put(("status", "Speaker test completed. Did you hear the spoken message?"))
            except Exception:
                self.events.put(("status", "Speaker test failed. Check the Windows output device and installed speech voice."))
        threading.Thread(target=work, daemon=True).start()

    def test_printer(self):
        selected = self.printer_list.curselection()
        if not selected:
            self.status.set("Select a printer in the list above to print a test page."); return
        if not (CONFIG_DIR / "SumatraPDF.exe").exists():
            self.status.set("Connect PrintBuddy first so it can install PDF printing support."); return
        printer = self.printers[selected[0]]["name"]
        self.status.set(f"Sending one test page to {printer}…")
        def work():
            from printing.test_page import make_test_page
            from printing.windows_printer import print_windows
            path = None
            try:
                os.environ["SUMATRAPDF_PATH"] = str(CONFIG_DIR / "SumatraPDF.exe")
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as file:
                    file.write(make_test_page()); path = file.name
                ok, reason = print_windows(printer, path, {"id": "test-page", "color": False, "copies": 1})
                self.events.put(("status", "Test page sent. Check the printer output." if ok else f"Test failed: {reason}"))
            except Exception:
                self.events.put(("status", "Could not create or send the test page. Check the app log and printer connection."))
            finally:
                if path:
                    Path(path).unlink(missing_ok=True)
        threading.Thread(target=work, daemon=True).start()

    def start_runtime(self):
        import pystray
        from PIL import Image, ImageDraw
        self.runtime = True
        self.connect_button.configure(state="disabled")
        self.status.set(f"Connected to {self.settings.get('SHOP_NAME', 'your shop')}. Printing runs in the background.")
        icon = Image.new("RGB", (64, 64), "#5036ed")
        draw = ImageDraw.Draw(icon)
        draw.rounded_rectangle((12, 22, 52, 49), radius=5, fill="white")
        draw.rectangle((20, 10, 44, 26), fill="white")
        def quit_app():
            self.events.put(("quit", None))
        self.tray = pystray.Icon("PrintBuddy", icon, "PrintBuddy", menu=pystray.Menu(
            pystray.MenuItem("Open PrintBuddy", lambda: self.events.put(("show", None)), default=True),
            pystray.MenuItem("Open dashboard", self.dashboard),
            pystray.MenuItem("Test speaker", self.test_speaker),
            pystray.MenuItem("Quit PrintBuddy", quit_app)))
        threading.Thread(target=self.tray.run, daemon=True).start()
        def worker():
            try:
                import agent
                agent.CASH_REQUEST_HANDLER = lambda job: self.events.put(("cash_request", job))
                agent.main(stop_event=self.stop_event)
            except Exception:
                self.events.put(("fatal", None))
        self.agent_thread = threading.Thread(target=worker, name="print-worker", daemon=True)
        self.agent_thread.start()

    def close(self):
        if self.runtime:
            self.root.withdraw()
        elif not self.connect_busy:
            self.root.destroy()

    def pump(self):
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind in ("printers", "scan_error"):
                    self.scan_busy = False
                    if kind == "printers":
                        selected = self.printer_list.curselection()
                        selected_name = self.printers[selected[0]]["name"] if selected and selected[0] < len(self.printers) else None
                        self.printers = value
                        self.printer_list.delete(0, tk.END)
                        for index, printer in enumerate(value):
                            self.printer_list.insert(tk.END, "  " + printer["name"])
                            if printer["name"] == selected_name:
                                self.printer_list.selection_set(index)
                        self.scan_status.set(f"{len(value)} printers found · refreshes automatically" if value else "No printers found. Add your printer in Windows Settings.")
                    else:
                        self.scan_status.set(value)
                    self.root.after(10_000, self.scan)
                elif kind == "connected":
                    self.settings = value
                    self.connect_busy = False
                    self.link.set("")
                    self.status.set(f"Connected to {value['SHOP_NAME']}. Ready! Choose your color and black-and-white printers in the dashboard. You can close this installer.")
                elif kind == "error":
                    self.connect_busy = False
                    self.connect_button.configure(state="normal")
                    self.status.set(value)
                elif kind == "status":
                    self.status.set(value)
                elif kind == "show":
                    self.root.deiconify(); self.root.lift()
                elif kind == "cash_request":
                    self.show_cash_request(value)
                elif kind == "cash_result":
                    job_id, ok, message = value
                    window = self.cash_windows.pop(job_id, None)
                    if window and window.winfo_exists():
                        window.destroy()
                    if not ok:
                        messagebox.showerror("Cash payment", message)
                elif kind == "quit":
                    self.stop_event.set()
                    self.status.set("Finishing the current job before quitting…")
                    self.root.deiconify()
                    self.root.after(250, self.finish_quit)
                elif kind == "fatal":
                    self.exit_code = 1
                    if self.tray:
                        self.tray.stop()
                    self.root.destroy()
                    return
        except queue.Empty:
            pass
        self.root.after(100, self.pump)

    def show_cash_request(self, job):
        job_id = job.get("id")
        if not job_id or job_id in self.cash_windows:
            return
        popup = tk.Toplevel(self.root)
        self.cash_windows[job_id] = popup
        popup.title("PrintBuddy cash payment")
        popup.attributes("-topmost", True)
        popup.resizable(False, False)
        width, height = 390, 330
        x = max(0, popup.winfo_screenwidth() - width - 24)
        y = max(0, popup.winfo_screenheight() - height - 72)
        popup.geometry(f"{width}x{height}+{x}+{y}")
        frame = ttk.Frame(popup, padding=22)
        frame.pack(fill="both", expand=True)
        name = job.get("display_name") or "Customer"
        pages = int(job.get("pages") or 0)
        copies = int(job.get("copies") or 1)
        kind = "Colour" if job.get("color") else "Black & white"
        amount = float(job.get("price_paise") or 0) / 100
        ttk.Label(frame, text="Cash payment requested", font=("Segoe UI", 16, "bold")).pack(anchor="w")
        ttk.Label(frame, text=f"{name} is waiting at the counter", font=("Segoe UI", 10)).pack(anchor="w", pady=(3, 16))
        details = f"Print job\n{pages} page{'s' if pages != 1 else ''} × {copies} cop{'ies' if copies != 1 else 'y'}\n{kind} · {job.get('paper') or 'A4'}"
        ttk.Label(frame, text=details, font=("Segoe UI", 11), justify="left").pack(anchor="w")
        ttk.Label(frame, text=f"Collect ₹{amount:.2f}", font=("Segoe UI", 20, "bold"), foreground="#087f5b").pack(anchor="w", pady=16)
        actions = ttk.Frame(frame)
        actions.pack(fill="x", side="bottom")
        ttk.Button(actions, text="Payment received", command=lambda: self.decide_cash(job_id, "received")).pack(side="left")
        ttk.Button(actions, text="Not received", command=lambda: self.decide_cash(job_id, "not_received")).pack(side="right")
        popup.protocol("WM_DELETE_WINDOW", lambda: popup.withdraw())
        popup.bell()

    def decide_cash(self, job_id, decision):
        def work():
            try:
                response = requests.post(
                    f"{self.settings['PRINTBUDDY_API_BASE']}/api/agent/cash-jobs",
                    headers={"Authorization": f"Bearer {self.settings['AGENT_TOKEN']}"},
                    json={"jobId": job_id, "decision": decision}, timeout=15)
                response.raise_for_status()
                self.events.put(("cash_result", (job_id, True, "")))
            except Exception:
                self.events.put(("cash_result", (job_id, False, "Could not update the cash payment. Check the internet connection and try again.")))
        threading.Thread(target=work, daemon=True).start()

    def finish_quit(self):
        if self.agent_thread.is_alive():
            self.root.after(250, self.finish_quit)
            return
        if self.tray:
            self.tray.stop()
        self.root.destroy()


def main():
    if "--self-test" in sys.argv:
        # Exercise packaged imports and discovery without installation, pairing or printing.
        path = Path(sys.argv[sys.argv.index("--self-test") + 1])
        import agent
        import pystray
        root = tk.Tk(); root.withdraw()
        root.update(); root.destroy()
        from printing.test_page import make_test_page
        path.write_text(json.dumps({"ok": True, "printers": get_discovered_printers(), "test_pdf": make_test_page().startswith(b"%PDF")}), encoding="utf-8")
        return
    root = tk.Tk()
    app = PrintBuddyWindow(root, background="--background" in sys.argv)
    root.mainloop()
    raise SystemExit(app.exit_code)


if __name__ == "__main__":
    main()
