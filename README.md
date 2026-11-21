# OpenWrt-RE205-v3-Custom

Custom OpenWrt 24.10.x ImageBuilder project for **TP-Link RE205 v3** (`ramips/mt76x8`, profile `tplink_re205-v3`).

The project adds a custom LuCI shell branded **AlMakhdhi SoftWare**:
- dark-purple top bar with the supplied logo;
- collapsible dark-purple sidebar containing the original LuCI menu tree;
- a dedicated **Quick Setup** entry;
- responsive layout and Arabic RTL support;
- the original LuCI pages and actions remain available through the menu.

## Important design / compatibility notes

This project overlays the Bootstrap theme's Ucode templates and menu module through ImageBuilder's `FILES` directory. The custom stylesheet is installed as `/www/luci-static/almakhdhi/cascade.css` and loaded **after** the upstream Bootstrap CSS. It deliberately does not replace OpenWrt's own `/www/luci-static/bootstrap/cascade.css`, because replacing that core stylesheet would remove essential LuCI styling.

The theme files are:
- `files/usr/share/ucode/luci/template/themes/bootstrap/header.ut`
- `files/usr/share/ucode/luci/template/themes/bootstrap/footer.ut`
- `files/www/luci-static/resources/menu-bootstrap.js`
- `files/www/luci-static/almakhdhi/cascade.css`
- `scripts/patch_theme.py` (pre-build validation and safe template patching)

## Build defaults

| Setting | Value |
|---|---|
| Device | TP-Link RE205 v3 |
| Target/profile | `ramips/mt76x8` / `tplink_re205-v3` |
| OpenWrt | Latest available 24.10.x point release, resolved during build |
| LAN | `192.168.1.20/24` |
| DHCP server | Disabled on LAN |
| DHCPv6 / RA / NDP | Disabled on LAN |
| 2.4 GHz SSID | `AbduRaheem_2G` |
| 5 GHz SSID | `ABDURAHEEM_5G` |
| Hostname | `AbduRaheem` |
| Requested TX power | 20 dBm (subject to regulatory and hardware limits) |

Wi-Fi is open by default, matching the supplied original project settings. To enable WPA2, set `WIFI_KEY` in `files/etc/uci-defaults/99-custom-settings` to a strong key of at least 8 characters. Do not commit real credentials to a public repository.

Edit `COUNTRY`, `GATEWAY`, and `DNS` in the same script if needed. DHCP is disabled, so configure a client manually with an address in `192.168.1.0/24` to reach the router.

## Repository layout

```text
.github/workflows/build.yml
assets/logo-original.png
files/etc/banner
files/etc/uci-defaults/99-custom-settings
files/usr/share/ucode/luci/template/themes/bootstrap/header.ut
files/usr/share/ucode/luci/template/themes/bootstrap/footer.ut
files/usr/share/luci/menu.d/luci-app-almakhdhi.json
files/usr/share/rpcd/acl.d/luci-app-almakhdhi.json
files/www/luci-static/almakhdhi/logo.png
files/www/luci-static/almakhdhi/cascade.css
files/www/luci-static/resources/menu-bootstrap.js
files/www/luci-static/resources/view/almakhdhi/quicksetup.js
packages.txt
scripts/patch_theme.py
```

## Build with GitHub Actions

1. Create a repository named `OpenWrt-RE205-v3-Custom`.
2. Upload the **contents** of this folder to the repository root. Make sure `.github/workflows/build.yml` is included.
3. Open **Actions → Build OpenWrt - TP-Link RE205 v3 Custom**.
4. Run the workflow manually, or push to `main`. Optional inputs allow choosing an OpenWrt 24.10.x version and ImageBuilder profile.
5. Download the artifact named `openwrt-re205-v3-custom-<version>`. It contains factory/sysupgrade images when produced, checksums, and the package manifest.

The workflow runs local project checks before downloading/building ImageBuilder. It does not need a repository secret.

## Flashing

- From stock TP-Link firmware, use the **factory** image only if the device's stock web UI accepts it.
- From an existing OpenWrt installation, use the **sysupgrade** image.
- Verify hardware revision and image target before flashing. Back up the original firmware/configuration first. Flashing always carries a risk of bricking the device.

## Notes

- This is an ImageBuilder project, not a full OpenWrt SDK build; packages are listed in `packages.txt`.
- The custom theme changes the LuCI shell/layout but does not remove upstream LuCI pages.
- The Quick Setup page provides shortcuts to the standard Network, Wireless, and Administration pages; it does not silently reconfigure network credentials.
- No default root password is baked in. Set a root password immediately after first boot.
