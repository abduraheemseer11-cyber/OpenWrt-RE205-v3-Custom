# OpenWrt custom build - TP-Link RE205 v3

Automatic GitHub Actions build of OpenWrt 24.10.x (latest point release, resolved at build time)
for **TP-Link RE205 v3** (MT7628AN, 64 MB RAM, 8 MB flash, ramips/mt76x8) using the official ImageBuilder.

## Baked-in defaults (`files/etc/uci-defaults/99-custom-settings`)

| Setting | Value |
|---|---|
| LAN IP | 192.168.1.20 / 255.255.255.0 |
| DHCP (IPv4) | disabled (`dhcp.lan.ignore=1`) |
| DHCPv6 / RA / NDP | disabled; LAN `ip6assign` and ULA prefix removed |
| 2.4 GHz SSID | `AbduRaheem_2G` |
| 5 GHz SSID | `ABDURAHEEM_5G` |
| TX power | 20 dBm (capped by driver/regulatory domain) |
| Hostname | `AbduRaheem` |
| SSH banner | `files/etc/banner` (contains AbduRaheem) |

The variables at the top of the script (WIFI_KEY, COUNTRY, GATEWAY, DNS...) can be edited before building.

## Layout

```
.github/workflows/build.yml          GitHub Actions workflow
files/etc/uci-defaults/99-custom-settings   first-boot settings script
files/etc/banner                     SSH/login banner
packages.txt                         packages passed to ImageBuilder
```
ImageBuilder does not use a `.config` file, so packages live in `packages.txt` (one per line, `-name` removes one).

## How to build

1. Create a new GitHub repository and upload **the contents of this folder** (keep the `.github` folder; it is hidden on some systems).
2. Open **Actions** > *Build OpenWrt - TP-Link RE205 v3*. It runs on every push to `main`, or press **Run workflow** (you may set a version such as `24.10.4`, or a profile).
3. When finished, download the artifact `openwrt-re205-v3-<version>` from the run page. It contains the `sysupgrade` and `factory` images, `sha256sums` and the manifest.

## Flashing

- From stock TP-Link firmware: use the web UI firmware upgrade with the **factory** image.
- From an existing OpenWrt: `sysupgrade -n` with the **sysupgrade** image (or LuCI > System > Backup/Flash Firmware).
- Back up the original flash first (`/dev/mtd*`) - flashing is at your own risk.

## Important notes

- **Profile name:** ImageBuilder profile names use the form `tplink_re205-v3` (not `tp-link_...`). The workflow checks that the profile exists and, if not, prints the available TP-Link profiles in the log; then re-run with the right name via *Run workflow*.
- **Wi-Fi is OPEN by default** (as in stock OpenWrt, and no password was requested). Set `WIFI_KEY` in the script (8+ chars) to use WPA2-PSK, or set it from LuCI after first boot.
- **No root password on first boot:** OpenWrt then offers telnet only and SSH stays closed until a root password is set (via telnet `passwd`, or LuCI > System > Administration). Bake one in only if you accept it living in a public repo (use a private repo).
- **Static IP only, no DHCP:** to reach the router, set your PC to a 192.168.1.x address. Without `GATEWAY`/`DNS` the router itself has no route to the internet (so no `opkg update`).
- **TX power:** 20 dBm is requested, but the mt76 drivers cap it by hardware limits and country code; set `COUNTRY` if needed and check with `iwinfo`.
- `luci-i18n-base-ar` gives LuCI an Arabic interface; remove it from `packages.txt` if you don't want it.
