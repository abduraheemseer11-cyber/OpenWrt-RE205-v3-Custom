# WrtMax Firmware for TP-Link RE205 v3

OpenWrt-based firmware for the TP-Link RE205 v3 (AC750 Wi-Fi range extender) with the WrtMax Firmware Solutions identity. The image is built in GitHub Actions with the OpenWrt ImageBuilder. The WrtMax control panel is static pages plus shell CGI scripts served by uhttpd, so the image does not need LuCI.

## Hardware

Taken from the upstream OpenWrt commit that added the device (`ramips: add support for TP-Link RE205 v3`, device profile `tplink_re205-v3`, target `ramips/mt76x8`):

| Item | Value |
|---|---|
| SoC | MediaTek MT7628AN, 580 MHz |
| RAM / flash | 64 MB / 8 MB |
| 2.4 GHz | MT7628AN built-in, 2T2R, up to 300 Mbps (radio0, phy0) |
| 5 GHz | MT7610EN, 1T1R, up to 433 Mbps (radio1, phy1) |
| Ethernet | 1 × 10/100 Mbps |
| Serial | UART on PCB, 57600 8N1 |

The 2.4 GHz and 5 GHz LEDs and the signal indicator are driven by GPIO in the upstream device tree.

## Project layout

```
.github/workflows/build.yml          Lint, then build the image with ImageBuilder
config/packages.txt                  Extra packages on top of the device profile
files/                               Overlay copied into the image
  banner                             Login banner with support number
  config/wrtmax                      WrtMax settings (watchdog, reboot time)
  wrtmax/release                     Product, version and support number
  wrtmax/mode                        Current Quick Mode (ap by default)
  init.d/wrtmax                      Service: rogue-DHCP guard and watchdog
  uci-defaults/90-wrtmax             First-boot and factory-reset defaults
  usr/sbin/wrtmax-mode               Quick Mode switch (ap, wds, wisp)
  usr/sbin/wrtmax-watchdog           Stability monitor and scheduled reboot
  usr/sbin/wrtmax-guard              nftables rule: block rogue DHCP on Wi-Fi ports
  usr/sbin/wrtmax-scan               Scan nearby networks and rate channel congestion
  usr/sbin/wrtmax-autochannel        Pick the least congested channel per radio
  www/index.html                     Panel (Arabic and English, responsive)
  www/assets/app.js, app.css         Panel logic and styles
  www/assets/logo.png                WrtMax logo
  www/cgi-bin/wrtmax-status          Read-only status JSON
  www/cgi-bin/wrtmax-clients         Read-only client list JSON
  www/cgi-bin/wrtmax-analyzer        Read-only channel congestion JSON (scans)
  www/cgi-bin/wrtmax-action          PIN-protected settings and actions
```

## Defaults

- LAN address `192.168.1.20/24`, hostname `WrtMax`.
- 2.4 GHz SSID `AbduRaheem_2G` (radio0), 5 GHz SSID `AbduRaheem_5G` (radio1). Both networks are open until a password is set (see Open decisions).
- Mode: access point on the LAN bridge (`ap`).
- Support number `776 538 297` in the login banner, the panel footer and the status data.
- Factory reset (device button or `firstboot`) runs `uci-defaults` again, so the values above come back.
- Panel PIN: the default is the last six hex digits of the Ethernet MAC address, in uppercase. Only a SHA-256 hash is stored. The panel shows a warning while the default PIN is still in use.

## Panel

Open `http://192.168.1.20/` from a device on the LAN. Dashboard, Wi-Fi analyzer results and the client list are read-only and need no PIN. Changing anything (mode, channel, TX power, blocking, watchdog, PIN, backup) requires the PIN in the top bar.

Security limits to know about:
- The panel is plain HTTP, so the PIN crosses the LAN unencrypted.
- A failed PIN costs one second. There is no lockout.
- Backups contain Wi-Fi passwords and the PIN hash. Keep them private.

## Building

1. Create a GitHub repository and upload the contents of this folder, keeping the folder structure.
2. Open **Actions → Build WrtMax firmware (TP-Link RE205 v3) → Run workflow**. The OpenWrt version defaults to 25.12.6.
3. The job runs a lint step first (shell syntax, shellcheck, `node --check` on the panel script), then builds the image.
4. Download the artifact `wrtmax-re205-v3-<version>`:
   - `*-factory.bin` is for the first install from the TP-Link web interface.
   - `*-sysupgrade.bin` is for upgrades once OpenWrt is running.

## Installing (read first)

- The OpenWrt install notes for the sibling RE200 v3 say TP-Link firmware newer than 1.1.0 can reject an OpenWrt factory image. Check the RE205 v3 notes on the OpenWrt wiki before flashing.
- Back up the stock firmware first.
- Keep a UART adapter ready (57600 8N1) for recovery. Upstream notes say U-Boot may be locked on newer TP-Link firmware.

## Feature status

| Requested feature | Status |
|---|---|
| WrtMax branding, logo, support number in footer, banner and status | Built |
| Fixed LAN address 192.168.1.20, default SSIDs, factory reset restores defaults | Built (test the reset on hardware) |
| Arabic and English, responsive panel | Built |
| Dashboard: uptime, RAM %, traffic rate, Ethernet link and speed, clients per band | Built |
| Temperature | Shown only if the kernel exposes a sensor. None is expected on MT7628 |
| Quick Mode: access point, range extender (WDS), WISP / repeater | Built. wds and wisp depend on driver support; verify on hardware |
| Quick Mode: PPPoE / DHCP router | Not built. The device has one Ethernet port, so the spec marks it as not recommended |
| Winbox MNDP / neighbour listing as WrtMax | Roadmap |
| Wi-Fi analyzer: congestion per channel | Built. The score is relative and comes from scan beacon power, not from the radio's busy-time counter |
| Automatic cleanest-channel selection | Built |
| Client manager: name, MAC, IP, signal, rate | Built |
| Client block / unblock | Built, using the wireless MAC filter |
| Per-client speed limits and SQM QoS | Roadmap (needs per-address traffic shaping) |
| Watchdog: reactivate Wi-Fi on failure, reboot on hang, daily scheduled reboot | Built |
| Rogue DHCP protection (reverse DHCP leakage) | Built. Disabled in WDS mode, where upstream DHCP replies arrive on the bridged STA |
| ARP spoofing and NetCut protection | Roadmap. Not implemented |
| Multi-SSID with VLAN isolation | Roadmap |
| 802.11r/k/v fast roaming | Roadmap. Depends on the driver, and the full `wpad` may not fit in 8 MB |
| 802.11s mesh | Roadmap. Verify with `iw list` on the device first |
| OneMesh | Not possible. It is proprietary to TP-Link |
| Hardware NAT / flow offloading | Not possible on MT7628. Software flow offloading is not enabled |
| CPU frequency control | Not built. No verified cpufreq support for this SoC in OpenWrt |
| "Super Channel" frequency unlock | Not built. Removing regulatory limits can interfere with licensed services such as radar, and is illegal in many countries. Use the country code and the TX power control instead |
| Loop prevention with kernel or switch changes | Not built. Standard STP on the bridge is the practical route |
| TX power control | Built, limited to 5–20 dBm. Check the limit against your country's rules |
| Settings backup | Built (download). Restore is roadmap |
| Speed test | Roadmap (needs an iperf3 server) |
| OTA updates from the team server | Roadmap (needs the server URL) |
| LuCI administration | Not included, to fit 8 MB |

## Test checklist (on the device)

1. Flash the factory image, open `http://192.168.1.20/`, and check the logo, footer and support number.
2. Check that the dashboard updates: uptime, memory, Ethernet link, client counts.
3. Change the PIN and confirm the default-PIN warning disappears.
4. Set a Wi-Fi password, then confirm the open-network warning is gone.
5. Scan and run Auto-select channel. Confirm `uci get wireless.radio0.channel` changed.
6. Block a test device and confirm it cannot rejoin. Then unblock it.
7. Switch to WDS and then WISP with a test parent network, and confirm the STA interface comes up (`iw dev`).
8. Enable the watchdog with a reachable gateway, then block the gateway and confirm the Wi-Fi restart after three failed checks.
9. Factory reset and confirm the IP, SSIDs, PIN and mode return to their defaults.
10. Download a backup and confirm it opens as a tar.gz.

## Open decisions

- Wi-Fi passwords and encryption. Both networks are open for now.
- Country code. It is not set, so the driver defaults apply. Set it to the country where the device is used, since it controls allowed channels and TX power.
- Panel PIN policy. The default is derived from the MAC address. You may prefer a printed PIN on the label.
