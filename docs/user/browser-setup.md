# Browser setup

tiles is a web page, so making it your start page means pointing the browser's new tab page at `https://t128n.github.io/tiles/`. Some desktop browsers can do that natively; others need a small extension.

If you serve or host your own copy, use that address instead.

## Which method

| Browser | Native support | Recommended method |
| --- | --- | --- |
| Helium | Yes | Built-in flag |
| Brave | Yes | Homepage as new tab |
| Vivaldi | Yes | Specific page |
| Safari (macOS) | Yes | Homepage as new tab |
| Chrome | No standard setting | Extension |
| Chromium | No standard setting | Extension |
| Edge | No standard setting | Extension or managed policy |
| Firefox | No standard setting | Extension |
| Zen | Special behavior | Preference and extension |
| Opera | No standard setting | Compatible extension |

These notes are for desktop browsers. Mobile browsers usually handle new tabs differently.

## Helium

1. Open `helium://flags/#custom-ntp`.
2. Enable **Custom New Tab Page URL**.
3. Enter `https://t128n.github.io/tiles/`.
4. Relaunch Helium.

No extension is required.

## Brave

1. Open `brave://settings/appearance`.
2. Under **Show home button**, choose **Enter custom web address**.
3. Enter `https://t128n.github.io/tiles/`.
4. Open `brave://settings/newTab`.
5. Set **New Tab Page shows** to **Homepage**.

You can hide the Home button afterwards.

## Vivaldi

1. Open `vivaldi://settings/tabs/`.
2. Find **New Tab Page**.
3. Select **Specific Page**.
4. Enter `https://t128n.github.io/tiles/`.

No extension is required.

## Safari (macOS)

1. Open **Safari → Settings → General**.
2. Set **Homepage** to `https://t128n.github.io/tiles/`.
3. Set **New tabs open with** to **Homepage**.
4. Optionally, set **New windows open with** to **Homepage** as well.

## Chrome and Chromium

Install [Custom New Tab](https://chromewebstore.google.com/detail/custom-new-tab/lfjnnkckddkopjfgmbcpdiolnmfobflj) from the Chrome Web Store and set its URL to `https://t128n.github.io/tiles/`.

Chrome has no personal setting for an arbitrary new tab URL. Its `NewTabPageLocation` policy is an alternative in managed environments.

## Microsoft Edge

On a personal installation, use a compatible new tab extension such as [Custom New Tab](https://chromewebstore.google.com/detail/custom-new-tab/lfjnnkckddkopjfgmbcpdiolnmfobflj).

On a managed Windows installation, Edge also supports the [`NewTabPageLocation`](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies#newtabpagelocation) policy. Microsoft documents it for managed or domain-joined devices.

## Firefox

Install [New Tab Override](https://addons.mozilla.org/en-US/firefox/addon/new-tab-override/). In the extension settings, choose a custom URL and enter `https://t128n.github.io/tiles/`. The extension can also leave focus in the address bar.

## Zen

Zen opens a floating URL bar instead of a normal new tab page.

1. Open `about:config`.
2. Set `zen.urlbar.replace-newtab` to `false`.
3. Install [New Tab Override](https://addons.mozilla.org/en-US/firefox/addon/new-tab-override/).
4. Configure `https://t128n.github.io/tiles/`.

This restores Firefox-style new tabs before the extension replaces them.

## Opera

Opera's settings cover Speed Dial and startup pages, not an arbitrary website as the new tab page. Try [Custom New Tab](https://chromewebstore.google.com/detail/custom-new-tab/lfjnnkckddkopjfgmbcpdiolnmfobflj), but Opera has historically restricted extensions that replace its Speed Dial, so this is less certain than the other methods.

## If the new tab does not feel right

Native configuration renders tiles directly. Some extensions redirect instead, which can show a brief flash or leave focus in the address bar. For a keyboard-driven workflow, test <kbd>Ctrl</kbd> + <kbd>T</kbd> and type immediately afterwards.
