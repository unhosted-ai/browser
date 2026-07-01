# Terms of Use

_Last updated: 2026-05-19._

Unhosted Browser ("the Software") is open-source desktop software distributed under the MIT License (see [`LICENSE`](LICENSE)). These Terms govern your use of pre-built binaries and source code obtained from the unhosted-ai/browser repository.

## 1. License grant

The Software is licensed, not sold. The MIT License in [`LICENSE`](LICENSE) is the operative grant. These Terms add product-specific clarifications; if the two conflict, the MIT License controls for the copyright grant and the warranty/liability disclaimers below.

## 2. No warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. This applies whether the binary is signed/notarized or unsigned. Builds are currently **unsigned** — see [`STATUS.md`](STATUS.md).

## 3. Limitation of liability

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. In jurisdictions that do not allow exclusion of certain warranties or limitation of liability, the maintainer's aggregate liability is capped at the amount you paid for the Software (which is zero).

## 4. The agent

Unhosted Browser includes an autonomous assistant ("the agent") that can read the active page and, with your per-site approval, take actions on your behalf (navigate, open tabs, and any future act tools). You are responsible for:

- Reviewing each permission card before granting it.
- Verifying any action the agent suggests, especially in safety-, legal-, medical-, or finance-critical contexts. **The agent can be wrong, and a malicious page can attempt prompt injection.** Unhosted Browser's defenses (untrusted-input framing, permission gating, sensitive-site auto-block) reduce but do not eliminate this risk.
- Anything that happens when you opt in to a cloud LLM provider (OpenAI, Anthropic, custom endpoint). Their terms apply to the data you send them.

The agent is an AI system under the EU AI Act Art. 50; you are hereby informed you are interacting with one.

## 5. Acceptable use

You agree not to use Unhosted Browser to:

- Violate applicable law where you are.
- Probe, scan, or attempt to breach systems you are not authorized to access.
- Conduct automated activity at a scale or velocity that abuses third-party services.
- Circumvent technical access controls of websites or content you do not have permission to access.
- Generate, distribute, or facilitate CSAM, non-consensual intimate imagery, targeted harassment, or content prohibited under the applicable jurisdiction.

The cloud LLM providers you connect have their own Acceptable Use Policies that bind your prompts to them — read them.

## 6. Your data

Unhosted Browser does not collect your data. See [`PRIVACY.md`](PRIVACY.md) for the full account. Operating on your local data directory is your responsibility (back it up; encrypt your disk; revoke API keys you no longer use).

## 7. Updates

Unhosted Browser currently performs **check-only** update notifications (off by default, opt-in in Settings). Auto-installing updates may be enabled in a future release after the macOS Developer ID and Windows code-signing certificates are in place; you will be informed at that time and may disable it.

## 8. Third-party services

Connecting to OpenAI, Anthropic, a custom OpenAI-compatible endpoint, Ollama, LM Studio, llama.cpp, MLX, GitHub (for the optional public-profile lookup), Gravatar (for the optional avatar lookup), Cloudflare/Quad9/Google DoH (if enabled), or GitHub Releases (if `autoUpdateCheck` is enabled) means you accept those services' terms.

## 9. Brand

The Unhosted Browser name, the Δ + spark mark, and the wordmark in [`brand/`](brand/) follow the rules in [`brand/guidelines.md`](brand/guidelines.md). The MIT License grants you broad rights to the *code*; the brand marks are separate and not licensed for use that suggests endorsement of, or affiliation with, a forked or modified build.

## 10. Termination

You may stop using Unhosted Browser and delete the application and its data directory at any time. The maintainer may discontinue the Software, decline contributions, or restrict access to repository resources at any time.

## 11. Governing law and disputes

These Terms are governed by the laws of the maintainer's place of residence, without regard to conflict-of-laws principles, except where local mandatory consumer-protection law of your residence provides you stronger rights, in which case the local rule controls. Disputes shall first be addressed by good-faith correspondence with the maintainer (`h99311@gmail.com`).

## 12. Changes to these Terms

Material changes will be announced in the GitHub repo's Releases. The "Last updated" date at the top is canonical. Continued use after a change constitutes acceptance.

## Contact

Ankur Sinha — `h99311@gmail.com` — <https://github.com/unhosted-ai/browser/issues>.
