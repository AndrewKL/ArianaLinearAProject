# Who were the Minoans?

A Bronze Age civilisation on Crete, at its height roughly 1900–1450 BCE. We do
not know what they called themselves. "Minoan" is Arthur Evans's coinage, after
the legendary king Minos; their neighbours called them **Keftiu** (Egyptian),
**Kaptara** (Akkadian) and **Caphtor** (Hebrew).

Four things can be said with some confidence, and one cannot be said at all.

## They were local

Genome-wide data has settled the origin question. Minoans derive **62–86% of
their ancestry from the first Neolithic farmers** who brought agriculture from
western Anatolia into the Aegean, plus **9–17%** from populations related to
those of the Caucasus and Iran. They were not colonists from Egypt or Libya, as
Evans supposed.

The sampled Minoans carry **no steppe ancestry**. Mycenaeans — otherwise
genetically very similar — do. That is the single genetic difference between
the two peoples, and it matters below.

A stranger finding: on Bronze Age Crete, **first-cousin marriage appears to
have been systematic**. Of more than a thousand published ancient genomes
worldwide, no comparable system has turned up anywhere else. It may have kept
inherited land from fragmenting.

*Caveats:* sample sizes are small — 19 genomes in the 2017 study, 102 across
the whole Aegean and several millennia by 2023 — and Mediterranean heat is hard
on DNA. "Minoan" labels a material culture, not a bounded people.

## Their language is unknown, and probably has no relatives

Linear A is undeciphered. We can pronounce much of it, by borrowing sound
values from Linear B, without understanding it.

Two families have been argued for repeatedly, and neither has held:

- **Indo-European.** Duhoux's structural work finds heavy prefixing and
  suffixing, a poor fit. And since steppe ancestry tracks Indo-European spread
  imperfectly but really, its absence in Minoan samples — beside its presence
  in Greek-writing Mycenaeans — removes a prop rather than supplying one.
- **Semitic.** Pursued from Gordon and Best to the present without result. The
  dominant ancestry signal is Anatolian farmer, not Levantine, so the language
  would have had to arrive without the population.

Borrowed words are not a language family. `ku-ni-su` beside Akkadian *kunāšu*
(emmer) and `sa-sa-me` beside Semitic *šamaššammu* (sesame) both sit in grain
lists at Hagia Triada — commodities arriving with their names attached, which
is ordinary trade contact.

The current consensus treats Minoan as an **isolate**: no known relatives,
living or dead, and therefore no comparative framework to derive meanings from.

The one real hope is Egyptian. Three 18th-Dynasty sources — a scribal tablet of
Keftiu personal names, a list of Cretan place names, and the London Medical
Papyrus, which carries spells labelled as being in the Keftiu tongue — may
record the Minoan language *in a script we can read*. Whether "Keftiu" always
means Crete, and whether the spells are Minoan at all, are both contested.

## They traded across the eastern Mediterranean

| Direction | Languages of the partners |
|---|---|
| Egypt | Egyptian |
| Levant | Amorite, Canaanite, later Ugaritic — with **Akkadian** as the commercial lingua franca |
| Cyprus | unknown; written in Cypro-Minoan, **a script derived from Linear A** |
| Anatolia | Luwian, Hittite; Hurrian to the south-east |
| Aegean and mainland | pre-Greek languages, then Mycenaean Greek |

The Mari tablets (c. 1780–1760 BCE) record tin moving from Mari through Aleppo,
Qatna and Hazor to a *Kaptarite* at Ugarit — and record **an interpreter being
paid** to handle the exchange. Someone was bridging a language gap, and it was
worth writing down.

Linear A itself turns up on 48 inscriptions at 12 findspots beyond Crete:
heavily in the Cyclades (Akrotiri, Ayia Irini, Phylakopi), at Miletus and Troy
in Anatolia, at Mycenae and Tiryns, and once as far as **Tel Haror** in the
Negev.

## They wrote on clay that was never meant to last

Minoan administrative clay was **sun-dried, not fired**. A sun-dried tablet is
a temporary object; wet it and it is mud again. It survives only where a
building burned and baked it by accident.

So the corpus is a record of disasters. **1,167 of its 1,884 inscribed faces —
62% — come from Hagia Triada alone**, one complex destroyed by fire around
1450 BCE.

Most of it is not tablets:

| | count | what it is |
|---|---|---|
| nodules | 913 | clay squeezed round string or a fastening, sealed, often one sign |
| tablets | 489 | small page-shaped accounts |
| roundels | 194 | discs sealed round the rim — receipts, one impression per party |
| stone vessels | 63 | libation tables, carved, mostly repeating one religious formula |

The durable objects are the exception, and they are not archives: stone vessels,
inscribed pottery, metal (rings, pins, the Arkalochori axe), cave graffiti, and the
eight inscriptions of the ink class (`Zc`), written **in ink**.

That ink is the clue to what is missing. People who write in ink on a cup can
write on hide, papyrus or wood — and none of that survives in Crete's climate.
Some clay nodules even preserve, on their undersides, the impressions of the
folded documents they once sealed. The seals outlived the records.

## The one thing that cannot be said

What the Minoans thought, said or believed.

The medium preserved **accounting** — lists, totals, commodity marks. A
decipherment needs **connected language**, with syntax to work on. The Minoans
almost certainly had that; it was on the perishable material the nodules were
wrapped around.

What is left is about 1,600 clay objects that count things, plus 63 stone
vessels repeating a single formula — and that formula carries nearly the whole
weight of every translation proposed to date.

---

## Sources

- Hughey et al. (2013), *A European population in Minoan Bronze Age Crete*,
  Nature Communications — <https://www.nature.com/articles/ncomms2871>
- Lazaridis et al. (2017), *Genetic origins of the Minoans and Mycenaeans*,
  Nature — <https://www.nature.com/articles/nature23310>
- Skourtanioti et al. (2023), *Ancient DNA reveals admixture history and
  endogamy in the prehistoric Aegean*, Nature Ecology & Evolution —
  <https://pubmed.ncbi.nlm.nih.gov/36646948/>
- Y. Duhoux on Linear A structure; B. Davis (2014), *Minoan Stone Vessels with
  Linear A Inscriptions*, Aegaeum 36, for the libation formula.

Corpus figures are from this repository's database and can be reproduced:
`python3 -m lineara stats`, `python3 -m lineara show 'HT 31'`.
