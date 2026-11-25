# AlMakhdhi SoftWare — TP-Link RE205 v3 (OpenWrt 24.10)

Custom OpenWrt ImageBuilder project for `ramips/mt76x8`, profile `tplink_re205-v3`.
It retains LuCI's native controllers and page logic while replacing the visible navigation shell with an AlMakhdhi-branded header and slide-out sidebar.

## UI changes in this revision

- Removes the stock horizontal `Status / System / Network / Log out` navigation bar from view.
- Adds a fixed dark-purple header: hamburger at the far left, optimized Alameer logo, then **AlMakhdhi SoftWare**.
- Moves LuCI’s original `#mainmenu` node (or Bootstrap navigation list fallback) into a left slide-out drawer, preserving native links, dropdowns and logout action.
- Styles LuCI cards, forms, tables, buttons, status labels and login panel in the Alameer dark-purple/crimson palette.
- Keeps the native LuCI page/router/session logic; only the presentation and navigation container are changed.

## Wireless duplicate fix

Previous versions only replaced the two sections named `alameer_2g` and `alameer_5g`. That left the device's original `default_radio0` / `default_radio1` (or other pre-existing `wifi-iface` sections) in place, which could produce multiple APs advertising the same SSID.

The new `/usr/bin/alameer-reset-wireless` script now:

1. Enumerates every `wifi-iface` UCI section.
2. Deletes every section assigned to `radio0` or `radio1`.
3. Creates exactly one AP interface per radio.
4. Commits wireless configuration and reloads Wi-Fi.

The first-boot script calls this helper automatically. **For a router already running a previous Alameer image**, `/etc/uci-defaults` will not automatically rerun after a normal sysupgrade if its one-shot script has already been consumed. After installing this new image, connect by SSH and run:

```sh
/usr/bin/alameer-reset-wireless
```

Then reload the Wireless page. It should show one AP for radio0 and one AP for radio1. This command removes all existing wireless interface sections on those two radios before recreating the requested two; it does not reset the Wi-Fi radios' regulatory country.

## Network and wireless defaults

- Management address: `192.168.1.20/24`
- WAN and WAN6 UCI interfaces removed.
- LAN DHCP server disabled; the upstream router must provide DHCP.
- 2.4 GHz: `AbduRaheem_2G`, AP, open security, channel 6.
- 5 GHz: `AbduRaheem_5G`, AP, open security, channel 36, HT40.
- Requests `txpower=30` on both radios. Driver, calibration and regulatory rules may clamp actual output; 30 dBm is not guaranteed.

**Security:** both SSIDs are open (no password), as originally requested. Anyone in radio range may connect. LAN DHCP is disabled, so the upstream router must provide DHCP. For direct management, place a client on `192.168.1.0/24` and browse to `http://192.168.1.20/`.

## Build on GitHub

1. Download and extract this ZIP.
2. Create an empty GitHub repository.
3. Upload the extracted folder's **contents**, including hidden `.github`, to the repository root.
4. Open **Actions**, enable workflows if prompted, then run **Build Alameer OpenWrt 24.10**.
5. Download the `alameer-openwrt-24.10.8-tplink_re205-v3` artifact from the completed run.

The workflow uses the official OpenWrt 24.10.8 ImageBuilder, injects the custom files, and enforces a strict `< 6,000,000` byte check for both factory and sysupgrade images. It fails rather than publishing an image that violates the size limit. No GitHub-hosted build has been executed as part of preparing this source ZIP.

## Important firmware and lifecycle notes

- OpenWrt 24.10 is no longer the maintained stable branch as of this project's preparation date. Use a currently supported branch for security-sensitive deployments when device support permits.
- Stock RE205 v3 images already use most of the 8 MB flash budget. LuCI plus the custom UI may exceed the requested 6 MB image limit; the workflow will reject oversized output.
- Verify the exact hardware revision is RE205 v3. Use factory only for the supported stock-to-OpenWrt installation path and sysupgrade only from a compatible OpenWrt installation. Verify checksums and never interrupt power during flashing.

## Project layout

```text
.github/workflows/build-openwrt.yml
files/etc/uci-defaults/99-custom-config
files/usr/bin/alameer-reset-wireless
files/www/luci-static/bootstrap/alameer.css
files/www/luci-static/resources/alameer.js
files/www/luci-static/resources/logo.png
scripts/inject-theme-assets.sh
README.md
```


## RE205 v3 hardware limits and requested advanced features

The target in this repository is specifically **RE205 v3**. OpenWrt's device data lists an MT7628AN (single core, 580 MHz), 64 MB RAM, 8 MB flash, MT7610EN 5 GHz radio, and no USB. The image build is already constrained by the small flash partition and this workflow additionally enforces a 6,000,000-byte ceiling.

The following are important engineering limits; this repository does **not** pretend to implement unsupported functions:

- **Spectrum / Wi-Fi analyzer:** the MT76 driver and `iw` may expose per-interface survey counters (channel busy time, noise where supported). That is not a spectrum analyzer and does not provide a true RF spectrum waterfall or guaranteed SNR. SDR-based scanning is not possible without external SDR hardware (the RE205 has no USB port). This revision adds a read-only diagnostic command, `/usr/bin/alameer-device-capabilities`, to report what the running kernel and driver actually expose. A live LuCI chart/RPC service is not included.
- **CPU frequency control:** the MT7628AN is specified as a 580 MHz part. CPUFreq controls can only be offered if the kernel/device tree exposes a cpufreq driver and scaling interface. The diagnostic command checks this. No governor or clock values are forced, and no unsupported kernel options are assumed.
- **Super Channel:** this firmware does not bypass regulatory-domain, EEPROM, calibration, driver, or hardware limits. Editing `db.txt` or forcing unsupported channels can cause illegal transmission or radio instability. Only channels advertised as available by the installed driver/regulatory database should be used. No regulatory bypass is included.
- **Quick Setup:** the existing first-boot configuration remains the project's known network setup (static LAN `192.168.1.20`, DHCP server disabled, and the two configured APs). A guided, transactional LuCI wizard with validation/rollback is not included in this revision.
- **Loop prevention:** a software-only feature cannot guarantee hardware-level loop isolation on this device. IEEE 802.1D bridge STP can be used only if the relevant bridge and kernel/userspace support are present; it is not equivalent to switch silicon loop guard. No automatic port isolation or custom kernel loop detector is included.

The device capability script is intentionally read-only. Run it over SSH after boot:

```sh
/usr/bin/alameer-device-capabilities
```

### Scope of this source revision

This update fixes the LuCI navigation relocation by moving the native menu root intact into the sidebar, and adds a read-only hardware capability report. It does **not** claim that the five advanced features above are fully implemented. Implementing the complete live LuCI applications and backend services requires a separate development phase and runtime testing on the exact RE205 v3 hardware. The 8 MB flash / 64 MB RAM budget also means the existing 6 MB image limit may need reconsideration before adding packages.
