# Alameer Software — TP-Link RE205 v3 (OpenWrt 24.10)

A GitHub Actions project using the **official OpenWrt ImageBuilder** for `ramips/mt76x8`, profile `tplink_re205-v3`. The workflow pins the latest 24.10-series release available when this project was prepared: **24.10.8**.

> **Important lifecycle note:** OpenWrt 24.10 reached its projected end-of-life in September 2026. You specifically requested 24.10, so this project stays on that branch; it will not receive ongoing security maintenance. Consider moving to a supported stable branch before deploying this router on an untrusted network.

## What it configures

- Management address: `192.168.1.20/24`
- Removes `wan` and `wan6` UCI interfaces.
- Disables the LAN DHCP server. Connect the RE205 Ethernet port to your existing LAN/router and let that upstream router provide DHCP.
- 2.4 GHz AP: `AbduRaheem_2G`, open security, channel 6.
- 5 GHz AP: `AbduRaheem_5G`, open security, channel 36, `HT40`.
- Requests `txpower=30` on both radios. The driver, hardware calibration and regulatory domain may clamp this value; UCI cannot guarantee 30 dBm actual output.
- Installs a compact Alameer logo and dark-violet CSS/JS customizations for the Bootstrap LuCI theme.

## Security and connectivity warnings

1. **Both Wi-Fi networks are open (no password)** exactly as requested. Anyone in radio range may connect. Do not use this configuration for a private or trusted network.
2. **LAN DHCP is disabled.** A wireless client may associate but will not receive an IP lease from this extender. The upstream LAN must provide DHCP through the bridged Ethernet connection. For initial management, set your computer manually to an address such as `192.168.1.10/24`, connect to the same LAN, and browse to `http://192.168.1.20/`.
3. The first-boot script assumes the standard OpenWrt `radio0` and `radio1` device names and that the selected hardware profile exposes both radios.
4. The requested 30 dBm is not a promise of legal or achievable transmit power. Set the correct country/regulatory domain on the device and obey local regulations.
5. The 6 MB check is intentionally strict: **each factory and sysupgrade `.bin` must be below 6,000,000 bytes**. The published 24.10.8 stock RE205 v3 images are already about 5.70–5.71 MB, leaving less than 300 KB before this threshold. A full LuCI stack and custom assets are therefore very likely to exceed your limit. The workflow fails rather than publishing an oversized image; it does not silently drop LuCI or weaken the check.

## Build it on GitHub

1. Download and extract this ZIP.
2. Create a new empty repository on GitHub.
3. Upload the **contents** of the extracted folder (including the hidden `.github` directory) to the repository's default branch. Do not upload the parent folder as an extra nested directory.
4. Open the repository's **Actions** tab and enable Actions if GitHub prompts you.
5. Select **Build Alameer OpenWrt 24.10**, then choose **Run workflow**. A push to `main` or `master` also triggers the build.
6. Open the completed workflow run. Under **Artifacts**, download `alameer-openwrt-24.10.8-tplink_re205-v3`.
7. The artifact contains the factory image, sysupgrade image and `SHA256SUMS`. The job fails if either image is missing or is at least 6,000,000 bytes.

To publish a GitHub Release instead of only an Actions artifact, push a version tag such as `v1.0.0`. The same build and size checks run, then the two firmware images are attached to the release.

## Flashing

- Use the **factory** image only when installing OpenWrt from stock TP-Link firmware and only if the device's installation method accepts that image.
- Use **sysupgrade** from an already-installed compatible OpenWrt system.
- Verify the SHA-256 checksum before flashing.
- Never interrupt power during flashing. A wrong image or interrupted flash can brick the extender. Confirm the exact hardware revision on the label is **RE205 v3**.

## Repository layout

```text
.
├── .github/workflows/build-openwrt.yml
├── files/
│   ├── etc/uci-defaults/99-custom-config
│   ├── usr/share/ucode/luci/template/themes/bootstrap/   # populated from official theme in CI
│   └── www/luci-static/
│       ├── bootstrap/alameer.css
│       └── resources/
│           ├── alameer.js
│           └── logo.png
├── scripts/inject-theme-assets.sh
└── README.md
```

The build job extracts the original 24.10 Bootstrap `header.ut` from the official `luci-theme-bootstrap` package and injects the Alameer CSS/JS asset references into it. This preserves LuCI's native page shell instead of replacing its session, routing or view bootstrap logic with an incompatible hand-written template.

## Package and size policy

The ImageBuilder retains the target's device-required packages and adds `luci-base`, `luci-mod-admin-full`, `luci-theme-bootstrap`, `uhttpd` and `uhttpd-mod-ubus`. The workflow removes the requested legacy PPP/IPv6/firewall UI packages where present. ImageBuilder dependency resolution remains authoritative; do not remove target-required kernel or wireless packages to force a smaller file.

If the size gate fails, remove optional LuCI modules/assets or choose a smaller UI, then rebuild and retest. Do not bypass the check or flash an oversized image.
