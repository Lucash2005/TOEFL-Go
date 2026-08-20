#!/usr/bin/env python3
"""Build complete in-app study banks aligned with TOEFL / N4 targets."""

from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path

ROOT = Path("/workspace")
CACHE_PATH = Path("/tmp/wordlists/zh_cache.json")
OUT_TOEFL = ROOT / "src/data"
OUT_N4 = ROOT / "src/n4/data"

try:
    import eng_to_ipa as ipa
except ImportError:
    ipa = None

from concurrent.futures import ThreadPoolExecutor, as_completed

from deep_translator import GoogleTranslator

ZH_CACHE: dict[str, str] = json.loads(CACHE_PATH.read_text()) if CACHE_PATH.exists() else {}


def save_cache() -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(ZH_CACHE, ensure_ascii=False, indent=0))


def _translate_one(text: str) -> str:
    err = None
    for attempt in range(3):
        try:
            return GoogleTranslator(source="en", target="zh-TW").translate(text) or text
        except Exception as e:
            err = e
            time.sleep(0.4 * (attempt + 1))
    print("  translate fallback", text[:40], err)
    return text


def pretranslate(strings: list[str]) -> None:
    unique = []
    seen = set()
    for raw in strings:
        text = (raw or "").strip()
        if not text or text in ZH_CACHE or text in seen:
            continue
        seen.add(text)
        unique.append(text)
    if not unique:
        return
    print(f"  translating {len(unique)} strings…")
    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(_translate_one, s): s for s in unique}
        for fut in as_completed(futs):
            src = futs[fut]
            try:
                ZH_CACHE[src] = fut.result()
            except Exception:
                ZH_CACHE[src] = src
            done += 1
            if done % 50 == 0:
                save_cache()
                print(f"  translated {done}/{len(unique)}")
    save_cache()


def zh(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    if text not in ZH_CACHE:
        ZH_CACHE[text] = _translate_one(text)
    return ZH_CACHE[text]


def js_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def emit_array(path: Path, header: str, name: str, items: list[dict], footer: str = "") -> None:
    chunks = [header.rstrip() + "\n", f"export const {name} = [\n"]
    for item in items:
        chunks.append("  {\n")
        for key, value in item.items():
            if isinstance(value, str):
                chunks.append(f"    {key}: {js_str(value)},\n")
            elif isinstance(value, bool):
                chunks.append(f"    {key}: {'true' if value else 'false'},\n")
            elif isinstance(value, (int, float)):
                chunks.append(f"    {key}: {value},\n")
            else:
                chunks.append(f"    {key}: {json.dumps(value, ensure_ascii=False)},\n")
        chunks.append("  },\n")
    chunks.append("]\n")
    if footer:
        chunks.append(footer)
    path.write_text("".join(chunks))


def phonetic(word: str) -> str:
    if not ipa:
        return ""
    try:
        p = ipa.convert(word)
        if not p or "*" in p:
            return ""
        return f"/{p}/"
    except Exception:
        return ""


def category_for(word: str, extra: str | None = None) -> str:
    science = {
        "data", "formula", "hypothesis", "experiment", "species", "energy", "climate",
        "carbon", "oxygen", "gravity", "evolution", "virus", "bacteria", "cell",
    }
    writing = {"emphasize", "conclude", "summarize", "paragraph", "essay", "thesis"}
    if word in science:
        return "Science"
    if word in writing:
        return "Writing"
    if extra:
        return extra
    return "Academic"


AWL = """
analyze approach area assess assume authority available benefit concept consist
constitute context contract create data define derive distribute economy environment
establish estimate evident export factor finance formula function identify income
indicate individual interpret involve issue labor legal legislate major method occur
percent period policy principle proceed process require research respond role section
sector significant similar source specific structure theory vary
achieve acquire administrate affect appropriate aspect assist category chapter commission
community complex compute conclude conduct consequent construct consume credit culture
design distinct element equate evaluate feature final focus impact injure institute
invest item journal maintain normal obtain participate perceive positive potential previous
primary purchase range region regulate relevant reside resource restrict secure seek
select site strategy survey text tradition transfer
alternative circumstance comment compensate component consent considerable constant
constrain contribute convene coordinate core corporate correspond criteria deduce
demonstrate document dominate emphasis ensure exclude fund framework illustrate
immigrate imply initial instance interact justify layer link locate maximize minor
negate outcome partner philosophy physical proportion publish react register rely
remove scheme sequence sex shift specify sufficient task technical technique technology
valid volume
access adequate annual apparent approximate attitude attribute civil code commit
communicate concentrate confer contrast cycle debate despite dimension domestic emerge
error ethnic goal grant hence hypothesis implement implicate impose integrate internal
investigate mechanism occupy option output overall parallel parameter phase predict
principal prior professional project promote regime resolve retain series statistic
status stress subsequent sum summary undertake
academy adjust alter amend aware capacity challenge clause compound conflict consult
contact decline discrete draft enable energy enforce entity equivalent evolve expand
expose external facilitate fundamental generate generation image liberal licence logic
margin medical mental modify monitor network notion objective orient perspective precise
prime psychology pursue ratio reject revenue stable style substitute sustain symbol
target transit trend version welfare whereas
abstract accurate acknowledge aggregate allocate assign attach author bond brief capable
cite cooperate discriminate display diversity domain edit enhance estate exceed expert
explicit federal fee flexible furthermore gender ignorant incentive incidence incorporate
index inhibit initiate input instruct intelligence interval lecture migrate minimum
ministry motive neutral nevertheless overseas precede presume rational recover reveal
scope subsidy tape trace transform transport underlie utilize
adapt adult advocate aid channel chemical classic comprehensive comprise confirm contrary
convert couple decade definite deny differentiate dispose dynamic eliminate empirical
equip extract file finite foundation globe grade guarantee hierarchy identical ideology
infer innovate insert intervene isolate media mode paradigm phenomenon priority prohibit
publication quote release reverse simulate sole somewhat submit successor thesis topic
transmit ultimate unique visible voluntary
abandon accompany accumulate ambiguous appendix appreciate arbitrary automatically bias
chart clarify commodity complement conform contemporary contradict crucial currency
denote detect deviate displace drama eventual exhibit exploit fluctuate guideline
highlight implicit induce inevitable infrastructure inspect intense manipulate minimize
nuclear offset paragraph plus practitioner predominant prospect radical random reinforce
restore revise schedule tense terminate theme thereby uniform vehicle via virtual visual
widespread
accommodate analogy anticipate assure attain behalf cease coherent coincide commence
compatible concurrent confine controversy converse device devote diminish distort duration
erode ethic format founded inherent insight integrate? integrity intrinsic invoke levy
likewise nonetheless notion? odd ongoing panel persist pose reluctance so-called
straightforward undergo whereby
adjacent albeit assemble collapse colleague compile conceive convince depress encounter
forthcoming incline integrity integrity integrity integrity integrity
""".split()

# Clean AWL list (remove duplicates / typos from the dump above)
AWL_HEADWORDS = []
seen = set()
for w in AWL:
    w = w.strip("?.,").lower()
    if not w.isalpha() or w in seen:
        continue
    seen.add(w)
    AWL_HEADWORDS.append(w)

TOEFL_EXTRA = """
although however therefore because while whereas despite instead besides moreover
furthermore nevertheless meanwhile otherwise unless whether enough several various
numerous common important different possible necessary difficult large small high
low early late often always never usually probably perhaps climate weather temperature
species animal plant forest ocean river mountain electricity fuel oil gas carbon
oxygen water air soil agriculture farmer crop harvest industry factory machine computer
internet science scientist experiment laboratory university college student teacher
professor classroom homework exam lecture campus library textbook article newspaper
magazine author writer reader audience speech language culture tradition history
society government law court crime police election vote president citizen tax trade
market price cost profit company business worker job career salary unemployment
population city urban rural traffic transportation vehicle airplane train hospital
doctor patient disease medicine treatment health food diet nutrition exercise sport
music art film museum tourism travel hotel restaurant pollution waste recycle
conservation wildlife habitat earthquake volcano flood storm hurricane drought season
century decade ancient modern invention discovery exploration space planet star
satellite gravity evolution gene cell brain heart blood bone muscle skin virus
bacteria vaccine advantage disadvantage reason example opinion agree disagree compare
contrast cause effect solution problem result conclusion introduction paragraph essay
topic sentence detail support evidence argument claim statement question answer
choice option instruction direction requirement deadline assignment presentation
discussion conversation announcement schedule reservation appointment library
""".split()


def unique_words(words: list[str], limit: int) -> list[str]:
    out, seen = [], set()
    for w in words:
        w = re.sub(r"[^a-zA-Z\-]", "", w).lower()
        if len(w) < 3 or w in seen:
            continue
        seen.add(w)
        out.append(w)
        if len(out) >= limit:
            break
    return out


def toefl_vocab(limit: int = 800) -> list[dict]:
    words = unique_words(AWL_HEADWORDS + TOEFL_EXTRA, limit)
    pretranslate(words)
    items = []
    for i, word in enumerate(words, 1):
        meaning = zh(word)
        if i % 3 == 0:
            example = f"The lecture used “{word}” to explain the main idea."
            example_zh = f"這堂課用「{word}」來說明主旨。"
        elif i % 3 == 1:
            example = f"This passage discusses {word} in a university context."
            example_zh = f"這篇文章在大學情境中討論 {word}。"
        else:
            example = f"Students should learn how to use “{word}” in academic writing."
            example_zh = f"學生應學會在學術寫作中使用「{word}」。"
        items.append(
            {
                "id": f"v{i:03d}",
                "word": word,
                "phonetic": phonetic(word),
                "meaning": meaning,
                "example": example,
                "exampleMeaning": example_zh,
                "category": category_for(word),
            }
        )
    return items


READING_TOPICS = [
    ("Urban Heat Islands", "Medium", "Cities trap heat because asphalt and buildings absorb sunlight. Nighttime temperatures stay high, increasing energy use for cooling. Planting trees and using reflective roofs can reduce the effect."),
    ("Sleep and Memory", "Easy", "Deep sleep helps the brain store new information. Students who sleep fewer than six hours often score lower on tests. Short naps can help, but they should not replace regular nighttime sleep."),
    ("Coral Bleaching", "Medium", "When ocean water becomes too warm, corals expel the algae that give them color and food. Large bleaching events can kill reefs. Reducing carbon emissions is the long-term solution, while local protection can buy time."),
    ("Plastic in Rivers", "Easy", "Much ocean plastic first travels through rivers. Waste management in cities near rivers can therefore reduce marine pollution. Cleanup projects help, but preventing waste at the source is more effective."),
    ("Bird Migration", "Medium", "Many birds travel thousands of kilometers between breeding and wintering grounds. They use stars, magnetic fields, and landmarks. Light pollution and tall buildings can confuse them during night flights."),
    ("Public Libraries", "Easy", "Libraries offer free internet, study space, and books. In some towns they also provide job-search help. Funding cuts can reduce hours, which affects students who do not have a quiet place at home."),
    ("Soil Erosion", "Medium", "Wind and rain can remove fertile topsoil from farms. Cover crops and terraces slow erosion. Lost soil reduces harvests and can clog rivers with sediment."),
    ("Vaccine History", "Medium", "Vaccines train the immune system to recognize a disease. They have reduced measles and polio in many countries. Public trust and cold storage are both needed for successful campaigns."),
    ("Remote Work", "Easy", "Working from home can save commuting time. Some employees miss informal office conversations. Companies now mix remote and in-person days to keep teamwork strong."),
    ("Desert Plants", "Easy", "Cacti store water in thick stems and have spines instead of broad leaves. These traits reduce water loss. Not all desert plants are cacti; some survive by growing quickly after rare rain."),
    ("Ancient Trade Routes", "Medium", "The Silk Road linked Asia, the Middle East, and Europe. Merchants carried silk, spices, and ideas. Cities along the route became centers of language mixing and new technologies."),
    ("Noise and Health", "Medium", "Constant traffic noise can raise stress and disturb sleep. Cities that add quieter pavement and more parks often report better rest. Indoor insulation also reduces night-time disturbance."),
    ("Honeybee Decline", "Medium", "Bee colonies have suffered from pesticides, parasites, and lost habitat. Because bees pollinate many crops, fewer bees can mean lower fruit yields. Planting wildflowers near farms can help."),
    ("Glacier Melt", "Medium", "Glaciers store fresh water that feeds rivers in summer. Rapid melting can cause floods now and water shortages later. Scientists track glacier thickness with satellites and field surveys."),
    ("Campus Dining Waste", "Easy", "Dining halls often throw away uneaten food. Trayless dining and smaller serving spoons can cut waste. Some universities donate leftover packaged food to local shelters."),
    ("Bilingual Children", "Medium", "Children who hear two languages from an early age can switch between them with practice. Early mixing of languages is normal. Supportive schools help students keep both languages."),
    ("Wind Energy", "Easy", "Wind turbines convert moving air into electricity. They produce little air pollution during operation. Critics worry about bird deaths and landscape views, so placement matters."),
    ("Antibiotic Resistance", "Hard", "Bacteria can evolve to survive medicines that once killed them. Overuse of antibiotics in clinics and farms speeds this process. Doctors now stress using antibiotics only when necessary."),
    ("Street Trees", "Easy", "Trees along sidewalks provide shade and reduce flood runoff. They need space for roots and regular watering when young. Poor planting can damage sidewalks and kill the tree."),
    ("Museum Digitization", "Medium", "Museums photograph artworks so people can study them online. Digital copies increase access but cannot replace seeing texture in person. Copyright rules affect what can be shared."),
    ("Tidal Power", "Hard", "Tides are predictable, unlike wind. Turbines in narrow bays can generate electricity from water flow. High construction costs have limited the number of large tidal plants."),
    ("Food Labels", "Easy", "Nutrition labels list calories, sugar, and allergens. Clear labels help shoppers compare products. Some companies use confusing serving sizes that make food look healthier."),
    ("Urban Wetlands", "Medium", "Wetlands in cities store stormwater and provide habitat for birds. Filling them for buildings increases flood risk. Restoration projects can bring wetlands back on former industrial land."),
    ("Peer Review", "Medium", "Scientists send papers to journals, and other experts check the methods. Peer review is not perfect, but it catches many errors. Replication studies test whether results hold."),
    ("Public Transit Fares", "Easy", "Cheap bus fares can increase ridership and reduce car traffic. If fares are too low, agencies may cut service. Some cities use subsidies so low-income riders pay less."),
    ("Seed Banks", "Medium", "Seed banks freeze seeds from many crop varieties. If disease or climate change harms farms, those seeds can help breeding programs. Power failures are a risk, so backup sites exist."),
    ("Screen Time", "Easy", "Long hours on phones can delay sleep if bright light is used at night. Setting a cutoff time before bed helps. Not all screen use is equal; reading on a dim e-reader is different from fast videos."),
    ("Mangrove Forests", "Medium", "Mangroves grow in salty coastal water and protect land from storm waves. Shrimp farms have removed many mangrove areas. Replanting is possible but takes years to restore full protection."),
    ("Open Data", "Hard", "Governments publish datasets on transport, weather, and budgets. Researchers and startups can build tools from this data. Privacy rules must hide personal details before release."),
    ("Indoor Air", "Easy", "Cooking and cleaning products can pollute indoor air. Opening windows and using exhaust fans reduces particles. In winter, people ventilate less, so indoor pollution can rise."),
    ("Stone Tools", "Medium", "Early humans made cutting tools from flint. Wear marks on tools tell archaeologists how they were used. Sites with many tools may have been workshops, not only camps."),
    ("Bike Lanes", "Easy", "Protected bike lanes separate cyclists from cars. Cities that add them often see more cycling and fewer injuries. Shop owners sometimes fear lost parking, but studies often show stable or higher visits."),
    ("Permafrost", "Hard", "Frozen ground in the Arctic stores carbon. When it thaws, microbes release greenhouse gases. This can speed warming, which then thaws more permafrost."),
    ("Community Gardens", "Easy", "Neighborhood gardens grow vegetables and bring people together. Waiting lists are common in big cities. Soil testing is important because old urban soil may contain lead."),
    ("Radio Astronomy", "Hard", "Radio telescopes listen to signals from space that eyes cannot see. Phones and satellites can create interference. Remote deserts are popular locations for new telescopes."),
    ("School Start Times", "Medium", "Teenagers often fall asleep later because of biology. Later school start times can improve attendance. Bus schedules and after-school jobs make the change complicated."),
    ("Composting", "Easy", "Food scraps can become soil instead of landfill waste. Home compost bins need a mix of wet scraps and dry leaves. Cities sometimes collect compost with regular trash service."),
    ("Coral Nurseries", "Medium", "Divers grow coral fragments on underwater frames, then attach them to damaged reefs. Survival depends on water temperature and water quality. Nurseries cannot replace cutting global emissions."),
    ("Map Projections", "Medium", "Flat maps distort the round Earth. Some projections enlarge high-latitude countries. Choosing a projection depends on whether the map is for navigation, area comparison, or classrooms."),
    ("Rainwater Harvesting", "Easy", "Collecting roof rain in tanks can supply gardens during dry weeks. First-flush devices discard the dirtiest first liters. Tanks must be covered to stop mosquitoes."),
]


def toefl_readings() -> list[dict]:
    items = []
    for i, (title, level, body) in enumerate(READING_TOPICS, 1):
        paras = body.strip()
        q1_right = "The passage presents a problem or phenomenon and related responses."
        items.append(
            {
                "id": f"r{i:03d}",
                "title": title,
                "level": level,
                "passage": paras,
                "questions": [
                    {
                        "prompt": "What is the best statement of the passage’s purpose?",
                        "options": [
                            "To tell a personal travel story only",
                            q1_right,
                            "To advertise a product",
                            "To list unrelated dictionary definitions",
                        ],
                        "answer": 1,
                        "explanation": "文章介紹現象或問題，並提到相關作法或影響。",
                    },
                    {
                        "prompt": f"Which topic is central to “{title}”?",
                        "options": [
                            "Fashion trends in the 1990s",
                            title,
                            "Cooking measurements",
                            "Professional basketball scores",
                        ],
                        "answer": 1,
                        "explanation": f"篇章主題是{title}。",
                    },
                ],
            }
        )
    return items


LISTENING_SEEDS = [
    ("Library Hours", "campus", "Student asks about weekend group rooms. Librarian says Saturday needs an online reservation and Sunday rooms close at 6 p.m."),
    ("Bee Dance", "lecture", "Professor explains that honeybees communicate food location by a dance showing direction and distance."),
    ("Office Hours", "campus", "A student missed class. The professor says slides are online but the quiz cannot be postponed except for documented illness."),
    ("Soil Layers", "lecture", "The lecture defines topsoil as the fertile upper layer and says erosion removes it faster than it forms."),
    ("Meal Plan", "campus", "Dining staff explain that unused meal swipes do not roll over, but dining dollars last until the term ends."),
    ("Tides", "lecture", "The professor says tides are caused mainly by the Moon’s gravity and are more predictable than wind for energy planning."),
    ("Bike Share", "campus", "A worker says students must use the campus app, helmets are recommended, and bikes must be returned to docks."),
    ("Peer Review", "lecture", "A journal editor describes how anonymous reviewers check methods before publication."),
    ("Dorm Quiet Hours", "campus", "An RA says quiet hours start at 11 p.m. on weekdays and that repeated noise complaints go to housing."),
    ("Mangroves", "lecture", "Mangroves reduce storm damage and store carbon; shrimp farming has removed many stands."),
    ("Lab Safety", "campus", "The TA requires goggles and closed shoes. Food is banned in the lab even during long experiments."),
    ("Urban Heat", "lecture", "Dark roofs absorb heat; light roofs and trees lower night temperatures in cities."),
    ("Internship Fair", "campus", "Career services says students should bring printed resumes and register online by Friday."),
    ("Glaciers", "lecture", "Glaciers feed summer rivers; rapid melt can cause near-term floods and later water shortages."),
    ("Printer Quota", "campus", "IT says each student gets 100 pages monthly; extra pages can be purchased at the help desk."),
    ("Antibiotics", "lecture", "Overuse lets bacteria survive drugs; the professor urges using antibiotics only when needed."),
    ("Language Exchange", "campus", "The center pairs conversation partners. Meetings are 45 minutes and must be logged in the portal."),
    ("Seed Banks", "lecture", "Frozen seeds protect crop diversity if disease or climate harms farms."),
    ("Bus Pass", "campus", "A student ID works as a bus pass in the city, but it is invalid after graduation."),
    ("Radio Telescopes", "lecture", "Remote deserts are chosen so phone signals do not drown out space radio noise."),
    ("Counseling Appointment", "campus", "Counseling has same-week slots for urgent cases; regular visits are booked two weeks ahead."),
    ("Wetlands", "lecture", "Urban wetlands store stormwater; filling them for buildings increases floods."),
    ("Course Waitlist", "campus", "Waitlisted students should attend the first class; the instructor can add people if others drop."),
    ("Permafrost", "lecture", "Thawing permafrost releases greenhouse gases, which can cause more thawing."),
    ("Study Abroad", "campus", "Applications need a faculty recommendation and a minimum GPA of 3.0."),
    ("Map Projections", "lecture", "Flat maps distort Earth; some projections enlarge countries near the poles."),
    ("Lost ID", "campus", "A replacement student ID costs fifteen dollars and takes one business day at the card office."),
    ("Coral Nurseries", "lecture", "Divers grow coral fragments and attach them to reefs, but nurseries cannot replace cutting emissions."),
    ("Tutoring Center", "campus", "Drop-in math tutoring is evenings only; writing appointments must be booked."),
    ("Indoor Air", "lecture", "Cooking particles rise indoors; exhaust fans and open windows reduce exposure."),
    ("Scholarship Deadline", "campus", "The essay and transcript are due March 1 at 5 p.m.; late files are not accepted."),
    ("Bike Lanes", "lecture", "Protected lanes usually increase cycling and reduce injuries, despite parking worries."),
    ("Housing Lottery", "campus", "Seniors pick first; students who miss the lottery window go to leftover rooms."),
    ("Composting", "lecture", "Food scraps become soil if mixed with dry leaves; uncovered piles attract pests."),
    ("Guest Lecture", "campus", "Attendance is optional but extra credit requires a one-paragraph response online."),
    ("Open Data", "lecture", "Governments publish transport data after removing personal identifiers."),
    ("Gym Hours", "campus", "The gym opens at 6 a.m.; guest passes are limited to two per month."),
    ("Street Trees", "lecture", "Young trees need water and root space; poor planting can crack sidewalks."),
    ("Field Trip", "campus", "The geology trip leaves at 7 a.m. from the science building; lunch is not provided."),
    ("Rainwater Tanks", "lecture", "Roof tanks supply gardens; covers are needed to stop mosquitoes."),
]


def toefl_listening() -> list[dict]:
    items = []
    for i, (title, kind, summary) in enumerate(LISTENING_SEEDS, 1):
        if kind == "campus":
            script = f"Student: I have a question about {title.lower()}.\nStaff: {summary}\nStudent: Thanks, that is clear."
            prefix = "Campus Conversation"
        else:
            script = f"Professor: Today we will look at {title.lower()}. {summary} Keep this mechanism in mind for the exam."
            prefix = "Lecture Clip"
        items.append(
            {
                "id": f"l{i:03d}",
                "title": f"{prefix}: {title}",
                "script": script,
                "questions": [
                    {
                        "prompt": "What is the talk mainly about?",
                        "options": [
                            "A sports tournament score",
                            title,
                            "A restaurant menu",
                            "A movie review",
                        ],
                        "answer": 1,
                        "explanation": f"內容圍繞{title}。",
                    },
                    {
                        "prompt": "Which statement is supported?",
                        "options": [
                            "No details are given.",
                            summary.split(".")[0] + ".",
                            "The campus will close forever.",
                            "The professor cancels the course.",
                        ],
                        "answer": 1,
                        "explanation": "細節來自對話或講課摘要。",
                    },
                ],
            }
        )
    return items


SPEAKING_PROMPTS = [
    ("Independent", 15, 45, "Some people prefer to study alone. Others prefer a group. Which do you prefer and why?"),
    ("Independent", 15, 45, "Do you agree that it is better to take risks than always play it safe?"),
    ("Independent", 15, 45, "Should universities require all students to take a science course? Explain."),
    ("Independent", 15, 45, "Is it better to live in a big city or a small town while studying?"),
    ("Independent", 15, 45, "Do you prefer paper books or digital texts for academic reading?"),
    ("Independent", 15, 45, "Should students have a part-time job during the semester?"),
    ("Independent", 15, 45, "Agree or disagree: Teachers should assign homework every weekday."),
    ("Independent", 15, 45, "Would you rather take a difficult class that is useful or an easy class for a high grade?"),
    ("Independent", 15, 45, "Is group presentation work fair compared with individual papers?"),
    ("Independent", 15, 45, "Should phones be banned from lecture halls?"),
    ("Campus", 30, 60, "Reading: The university will extend dining hours until midnight during finals. Conversation: The woman supports it because students study late; the man worries about staffing costs. Explain the man’s opinion and his reason."),
    ("Campus", 30, 60, "Reading: The library will replace printed journals with online-only access. Conversation: The man likes 24-hour access; the woman worries about paywalls off campus. Explain the woman’s concern."),
    ("Campus", 30, 60, "Reading: Bike parking will move from the quad to a garage. Conversation: One student likes less clutter; the other says the garage is too far between classes. Summarize both views."),
    ("Campus", 30, 60, "Reading: A new rule requires first-year students to live on campus. Conversation: A woman says it builds community; a man says it is expensive. Explain the man’s opinion."),
    ("Campus", 30, 60, "Reading: The school will stop selling bottled water. Conversation: One student supports less plastic; the other says fountain water tastes bad. Explain the second student’s concern."),
    ("Integrated", 30, 60, "Reading: Three benefits of remote work: flexibility, less commuting, wider hiring. Lecture: blurred boundaries, home distraction, weaker teams. Summarize how the lecture challenges the reading."),
    ("Integrated", 30, 60, "Reading: Urban trees cut heat and floods. Lecture: poor species choice, root damage to pipes, high watering costs. Explain how the lecture challenges the reading."),
    ("Integrated", 30, 60, "Reading: Later high-school start times help teens. Lecture: bus conflicts, after-school jobs, sports lighting costs. Summarize the lecture’s challenges."),
    ("Integrated", 30, 60, "Reading: Seed banks protect food security. Lecture: power failure risk, germination loss, political access issues. Explain the lecture’s points."),
    ("Integrated", 30, 60, "Reading: Open government data boosts innovation. Lecture: poor documentation, privacy leaks, unequal internet access. Summarize the challenges."),
]


def toefl_speaking() -> list[dict]:
    items = []
    for i, (typ, prep, speak, prompt) in enumerate(SPEAKING_PROMPTS, 1):
        items.append(
            {
                "id": f"s{i:03d}",
                "type": typ,
                "prepSeconds": prep,
                "speakSeconds": speak,
                "prompt": prompt,
                "tips": ["先表明任務要求", "用 1–2 個具體理由或對應點", "控制時間、避免重覆"],
            }
        )
    return items


WRITING_PROMPTS = [
    ("Independent", 30, "Do you agree or disagree?\n“Teachers should assign homework every day.”\nUse reasons and examples."),
    ("Independent", 30, "Some people like a strict daily schedule. Others prefer flexibility. Which do you think is better for students?"),
    ("Independent", 30, "Do you agree that governments should spend more on public transportation than on new roads?"),
    ("Independent", 30, "Is it better to work in a team or independently at university?"),
    ("Independent", 30, "Do you agree that students should be required to learn a second language?"),
    ("Independent", 30, "Some people think university should be free. Others think students should pay. Which view do you support?"),
    ("Independent", 30, "Do you agree that technology has improved the quality of education?"),
    ("Independent", 30, "Is it more important for cities to build parks or housing?"),
    ("Independent", 30, "Do you agree that young people should travel before starting university?"),
    ("Independent", 30, "Should schools replace some exams with project work? Explain."),
    ("Integrated", 20, "Reading: three benefits of remote work. Lecture: challenges each benefit. Summarize the lecture and how it challenges the reading."),
    ("Integrated", 20, "Reading: urban trees solve heat and floods. Lecture: costs and side effects. Summarize the lecture’s challenges."),
    ("Integrated", 20, "Reading: later school start times help learning. Lecture: logistical problems. Explain how the lecture challenges the reading."),
    ("Integrated", 20, "Reading: seed banks guarantee food security. Lecture: technical and political limits. Summarize the lecture."),
    ("Integrated", 20, "Reading: open data creates jobs. Lecture: quality and privacy problems. Explain the challenges."),
    ("Integrated", 20, "Reading: bike lanes help business. Lecture: short-term disruption and parking loss claims. Summarize the lecture."),
    ("Integrated", 20, "Reading: composting is an easy city fix. Lecture: contamination and collection costs. Explain the challenges."),
    ("Integrated", 20, "Reading: digital museums increase access. Lecture: copyright and loss of in-person study. Summarize the lecture."),
    ("Integrated", 20, "Reading: wind power is clean and cheap. Lecture: bird deaths, storage, and siting fights. Explain the challenges."),
    ("Integrated", 20, "Reading: campus meal plans reduce food insecurity. Lecture: unused swipes and limited hours. Summarize the lecture."),
]


def toefl_writing() -> list[dict]:
    items = []
    for i, (typ, minutes, prompt) in enumerate(WRITING_PROMPTS, 1):
        outline = (
            ["一句總述 lecture 如何反駁 reading", "逐點對應", "不要寫個人意見"]
            if typ == "Integrated"
            else ["Introduction + thesis", "Reason 1 + example", "Reason 2 + example", "Conclusion"]
        )
        items.append(
            {
                "id": f"w{i:03d}",
                "type": typ,
                "minutes": minutes,
                "prompt": prompt,
                "outline": outline,
            }
        )
    return items


def toefl_quiz(vocab: list[dict]) -> list[dict]:
    questions = []
    for i, card in enumerate(vocab[:80], 1):
        distractors = [vocab[(i + k) % len(vocab)]["meaning"] for k in (7, 13, 21)]
        options = distractors[:3] + [card["meaning"]]
        # unique options
        uniq = []
        for opt in options:
            if opt not in uniq:
                uniq.append(opt)
        while len(uniq) < 4:
            uniq.append(f"選項{len(uniq)}")
        answer = uniq.index(card["meaning"])
        questions.append(
            {
                "id": f"q{i:03d}",
                "section": "vocab",
                "prompt": f'Choose the best meaning of “{card["word"]}”.',
                "options": uniq[:4],
                "answer": answer,
                "explanation": f'{card["word"]} = {card["meaning"]}',
            }
        )
    strategy = [
        ("reading", "In academic reading, the main idea is usually…", ["a minor example only", "the central point the passage develops", "any date in the text", "the longest sentence"], 1, "主旨是全文圍繞展開的核心觀點。"),
        ("listening", "Campus listening detail questions often ask about…", ["favorite colors", "reasons, times, requirements, or opinions stated", "grammar labels", "the speaker’s age"], 1, "校園聽力常考原因、時間、規定與態度。"),
        ("speaking", "A strong independent speaking response usually…", ["avoids a position", "states a clear opinion and supports it", "lists ten unrelated ideas", "only reads the question"], 1, "獨立口說要立場清楚＋理由。"),
        ("writing", "In integrated writing, you should…", ["give only personal opinions", "explain how the lecture relates to the reading", "ignore the lecture", "copy the reading"], 1, "整合寫作重點是 lecture 如何對應 reading。"),
        ("strategy", "A useful daily TOEFL habit is…", ["cramming once", "short daily practice across sections plus vocabulary review", "memorizing one essay forever", "skipping listening"], 1, "分散練習比考前猛Ｋ有效。"),
    ]
    for j, (section, prompt, options, answer, expl) in enumerate(strategy, len(questions) + 1):
        questions.append(
            {
                "id": f"q{j:03d}",
                "section": section,
                "prompt": prompt,
                "options": options,
                "answer": answer,
                "explanation": expl,
            }
        )
    return questions


N4_GRAMMAR = [
    ("〜てあげる", "てあげる", "幫對方做某事", "Vて + あげる", "友達に本を貸してあげました。", "把書借給朋友了。", "授受"),
    ("〜てもらう", "てもらう", "請對方為自己做某事", "Vて + もらう", "先生に作文を直してもらいました。", "請老師幫我改作文了。", "授受"),
    ("〜てくれる", "てくれる", "對方為我做某事", "Vて + くれる", "母が料理を作ってくれました。", "媽媽幫我做了料理。", "授受"),
    ("〜なければならない", "なければならない", "必須…", "Vない形 + なければならない", "早く起きなければなりません。", "必須早起。", "義務"),
    ("〜なくてもいい", "なくてもいい", "不必…也可以", "Vない形 + なくてもいい", "今日は会社へ行かなくてもいいです。", "今天不用去公司也可以。", "義務"),
    ("〜ほうがいい", "ほうがいい", "最好…", "Vた形／ない形 + ほうがいい", "もっと野菜を食べたほうがいいです。", "最好多吃一點蔬菜。", "建議"),
    ("〜つもりだ", "つもりだ", "打算…", "V辞書形 + つもりだ", "来年日本へ留学するつもりです。", "打算明年去日本留學。", "意志"),
    ("〜予定だ", "よていだ", "預定…", "Nの／V辞書形 + 予定だ", "明日会議の予定です。", "明天預定有會議。", "意志"),
    ("〜そうだ（樣態）", "そうだ", "看起來…", "Vます形／い形容詞語幹 + そうだ", "雨が降りそうです。", "看起來要下雨。", "樣態"),
    ("〜そうだ（傳聞）", "そうだ", "聽說…", "普通形 + そうだ", "田中さんは結婚したそうです。", "聽說田中結婚了。", "傳聞"),
    ("〜らしい", "らしい", "好像／聽說像是…", "普通形 + らしい", "今日は寒いらしいです。", "今天好像很冷。", "傳聞"),
    ("〜ようだ", "ようだ", "似乎…", "普通形 + ようだ", "彼は疲れているようです。", "他似乎累了。", "推測"),
    ("〜みたいだ", "みたいだ", "好像…（口語）", "N／普通形 + みたいだ", "子供みたいな質問です。", "像小孩子一樣的問題。", "推測"),
    ("〜ば", "ば", "如果…的話", "Vば形", "安ければ買います。", "如果便宜就買。", "條件"),
    ("〜たら", "たら", "如果／之後…", "Vた形 + ら", "東京へ行ったら、友達に会います。", "去了東京的話會見朋友。", "條件"),
    ("〜なら", "なら", "若是…的話", "N／普通形 + なら", "日本へ行くなら、京都がいいです。", "若是去日本，京都不錯。", "條件"),
    ("〜ても", "ても", "即使…也", "Vて + も", "雨が降っても行きます。", "即使下雨也要去。", "逆接"),
    ("〜のに", "のに", "卻…（不滿）", "普通形 + のに", "勉強したのに、忘れました。", "明明唸了卻忘了。", "逆接"),
    ("〜ところだ", "ところだ", "正要／正在／剛…", "V辞書形／ている／た + ところだ", "これから出かけるところです。", "正要出門。", "時態"),
    ("〜たばかり", "たばかり", "才剛…", "Vた形 + ばかり", "日本へ来たばかりです。", "才剛來日本。", "時態"),
    ("〜ようにする", "ようにする", "努力做到…", "V辞書形／ない形 + ようにする", "毎日運動するようにしています。", "盡量每天運動。", "努力"),
    ("〜ようになる", "ようになる", "變得能夠…", "V辞書形 + ようになる", "日本語が話せるようになりました。", "變得會說日語了。", "變化"),
    ("〜すぎる", "すぎる", "過於…", "ます形／形容詞語幹 + すぎる", "食べすぎました。", "吃太多了。", "程度"),
    ("〜やすい／にくい", "やすい／にくい", "容易／不容易…", "ます形 + やすい／にくい", "この本は読みやすいです。", "這本書容易讀。", "程度"),
    ("〜間に", "あいだに", "在…期間內", "Nの／Vている + 間に", "留守の間に荷物が届きました。", "不在時包裹送到了。", "時間"),
    ("〜てしまう", "てしまう", "做完／遺憾地發生", "Vて + しまう", "宿題を忘れてしまいました。", "把功課忘了。", "完了"),
    ("〜ておく", "ておく", "事先做…", "Vて + おく", "旅行の前に切符を買っておきます。", "旅行前先買票。", "準備"),
    ("〜てみる", "てみる", "試試看", "Vて + みる", "日本料理を作ってみます。", "試做日本料理。", "嘗試"),
    ("〜ていく", "ていく", "逐漸…而去", "Vて + いく", "これから寒くなっていきます。", "接下來會漸漸變冷。", "變化"),
    ("〜てくる", "てくる", "逐漸…而來", "Vて + くる", "日本語が分かってきました。", "日語漸漸懂了。", "變化"),
    ("〜てはいけない", "てはいけない", "不可以…", "Vて + はいけない", "ここで写真を撮ってはいけません。", "這裡不可以拍照。", "禁止"),
    ("〜ことができる", "ことができる", "能夠…", "V辞書形 + ことができる", "漢字を読むことができます。", "能夠讀漢字。", "可能"),
    ("〜たことがある", "たことがある", "曾經…", "Vた形 + ことがある", "富士山に登ったことがあります。", "曾經爬過富士山。", "經驗"),
    ("〜ことがある", "ことがある", "有時…", "V辞書形 + ことがある", "朝ごはんを食べないことがあります。", "有時不吃早餐。", "經驗"),
    ("〜なさい", "なさい", "請…（命令）", "ます形 + なさい", "早く寝なさい。", "早點睡。", "命令"),
    ("〜ください", "ください", "請…", "Vて + ください", "名前を書いてください。", "請寫名字。", "請求"),
    ("〜てから", "てから", "…之後", "Vて + から", "宿題をしてから遊びます。", "做完功課再玩。", "順序"),
    ("〜前に", "まえに", "在…之前", "V辞書形／Nの + 前に", "寝る前に本を読みます。", "睡前讀書。", "時間"),
    ("〜あとで", "あとで", "在…之後", "Vた形／Nの + あとで", "授業のあとで質問します。", "下課後提問。", "時間"),
    ("〜までに", "までに", "在…之前（期限）", "N／V辞書形 + までに", "五時までに来てください。", "請在五點前來。", "期限"),
    ("〜ながら", "ながら", "一邊…一邊", "ます形 + ながら", "音楽を聞きながら勉強します。", "邊聽音樂邊念書。", "同時"),
    ("〜たり〜たり", "たりたり", "又…又…", "Vた形 + たり", "休日は読んだり、散歩したりします。", "假日讀讀書、散散步。", "並列"),
    ("〜し〜し", "し", "又…而且…", "普通形 + し", "この店は安いし、美味しいです。", "這家店又便宜又好吃。", "並列"),
    ("〜ので", "ので", "因為…（較委婉）", "普通形 + ので", "寒いので、窓を閉めます。", "因為冷，所以關窗。", "原因"),
    ("〜ため（に）", "ために", "為了／因為", "Nの／V辞書形 + ために", "健康のために走ります。", "為了健康而跑步。", "目的"),
    ("〜ように（目的）", "ように", "以便…", "V辞書形／ない形 + ように", "忘れないようにメモします。", "以免忘記而做筆記。", "目的"),
    ("〜について", "について", "關於…", "N + について", "日本の文化について話します。", "談論日本文化。", "關係"),
    ("〜に対して", "にたいして", "對於…", "N + に対して", "質問に対して答えます。", "針對問題回答。", "關係"),
    ("〜として", "として", "作為…", "N + として", "留学生として来ました。", "以留學生身分前來。", "資格"),
    ("〜によって", "によって", "由於／依據", "N + によって", "場所によって天気が違います。", "依地點天氣不同。", "手段"),
    ("〜ばかりでなく", "ばかりでなく", "不但…而且", "N／普通形 + ばかりでなく", "日本語ばかりでなく英語も勉強します。", "不但日語也學英語。", "添加"),
    ("〜だけでなく", "だけでなく", "不但…", "N／普通形 + だけでなく", "雨だけでなく風も強いです。", "不但下雨風也大。", "添加"),
    ("〜かもしれません", "かもしれません", "也許…", "普通形 + かもしれません", "明日雨が降るかもしれません。", "明天也許會下雨。", "推測"),
    ("〜でしょう", "でしょう", "吧／大概", "普通形 + でしょう", "明日は晴れるでしょう。", "明天大概會晴。", "推測"),
    ("〜かどうか", "かどうか", "是否…", "普通形 + かどうか", "行くかどうかまだ分かりません。", "去不去還不知道。", "疑問"),
    ("〜という", "という", "叫做…", "N + という + N", "これは「origami」という紙です。", "這是叫做摺紙的紙。", "名稱"),
    ("〜とおり", "とおり", "照…那樣", "Nの／V普通形 + とおり", "説明書のとおりに作ります。", "照說明書做。", "依據"),
    ("〜まま", "まま", "維持原狀", "Vた形／Nの + まま", "靴のまま入ってはいけません。", "不可以穿鞋進去。", "狀態"),
    ("〜出す", "だす", "開始…起來", "ます形 + 出す", "急に雨が降り出しました。", "突然下起雨來。", "開始"),
    ("〜続ける", "つづける", "持續…", "ます形 + 続ける", "一時間歩き続けました。", "持續走了一小時。", "持續"),
    ("〜始める", "はじめる", "開始…", "ます形 + 始める", "去年から日本語を勉強し始めました。", "從去年開始學日語。", "開始"),
    ("〜直す", "なおす", "重新做…", "ます形 + 直す", "作文を書き直します。", "把作文重寫。", "再做"),
    ("〜合う", "あう", "互相…", "ます形 + 合う", "友達と助け合います。", "和朋友互相幫忙。", "相互"),
    ("〜させる", "させる", "讓／使…", "使役形", "子供に野菜を食べさせます。", "讓孩子吃蔬菜。", "使役"),
    ("〜られる（受身）", "られる", "被…", "受身形", "先生に名前を呼ばれました。", "被老師叫到名字。", "受身"),
    ("〜られる（可能）", "られる", "能夠…", "可能形", "漢字が読まれます。／読めます。", "能夠讀漢字。", "可能"),
    ("〜がる", "がる", "顯得…（第三人稱）", "い形容詞語幹 + がる", "弟は新しいたくしたがっています。", "弟弟顯得想要新的。", "感情"),
    ("〜さ", "さ", "…度／程度", "形容詞語幹 + さ", "富士山の高さを知っていますか。", "你知道富士山的高度嗎。", "名詞化"),
    ("〜中", "ちゅう", "正在…之中", "N + 中", "授業中は静かにしてください。", "上課中請保持安靜。", "時間"),
    ("〜ごとに", "ごとに", "每…", "N／V辞書形 + ごとに", "二時間ごとに薬を飲みます。", "每兩小時吃藥。", "反覆"),
    ("〜しか〜ない", "しかない", "只有…", "N + しか + ない", "百円しかありません。", "只有一百日圓。", "限定"),
    ("〜だけ", "だけ", "只…", "N／普通形 + だけ", "水だけ飲みます。", "只喝水。", "限定"),
    ("〜ほど", "ほど", "達到…程度", "N／普通形 + ほど", "今日は昨日ほど寒くないです。", "今天沒有昨天那麼冷。", "程度"),
    ("〜くらい／ぐらい", "くらい", "大約／程度", "N + くらい", "駅まで十分くらいかかります。", "到車站大約要十分鐘。", "程度"),
    ("〜ことにする", "ことにする", "決定做…", "V辞書形 + ことにする", "毎日走ることにしました。", "決定每天跑步。", "決定"),
    ("〜ことになる", "ことになる", "決定／結果變成…", "V辞書形 + ことになる", "来月から転勤することになりました。", "決定下個月調職。", "決定"),
    ("〜ことになっている", "ことになっている", "規定是…", "V辞書形 + ことになっている", "ここでは靴を脱ぐことになっています。", "這裡規定要脫鞋。", "規定"),
    ("〜はずだ", "はずだ", "理應…", "普通形 + はずだ", "彼は今ごろ着くはずです。", "他這時候理應到了。", "推測"),
    ("〜わけだ", "わけだ", "難怪／也就是說", "普通形 + わけだ", "昨日勉強したから、よくできるわけです。", "昨天唸了，難怪會。", "說明"),
    ("〜てよかった", "てよかった", "幸好…了", "Vて + よかった", "傘を持ってきてよかったです。", "幸好有帶傘。", "評價"),
]


def n4_grammar() -> list[dict]:
    items, seen = [], set()
    for i, row in enumerate(N4_GRAMMAR, 1):
        word = row[0]
        if word in seen:
            continue
        seen.add(word)
        items.append(
            {
                "id": f"g{len(items)+1:03d}",
                "type": "grammar",
                "word": word,
                "reading": row[1],
                "meaning": row[2],
                "pattern": row[3],
                "example": row[4],
                "exampleMeaning": row[5],
                "category": row[6],
            }
        )
    return items[:80]


def keep_jp_word(word: str) -> bool:
    if not word or word in {"あ", "う", "え", "お", "ん", "～"}:
        return False
    if len(word) == 1 and re.fullmatch(r"[ぁ-んァ-ン]", word):
        return False
    return True


def collect_n4_rows(limit: int = 1500) -> list[dict]:
    rows = []
    seen = set()

    def push(word, reading, meaning_en, example_ja, example_en, category):
        if not keep_jp_word(word):
            return
        key = (word, reading or word)
        if key in seen:
            return
        seen.add(key)
        gloss = (meaning_en or word).split(",")[0].split(";")[0].strip()
        rows.append(
            {
                "word": word,
                "reading": reading or word,
                "gloss": gloss,
                "example_ja": example_ja or f"{word}を使います。",
                "example_en": example_en or gloss,
                "category": category,
            }
        )

    for level in ("n5", "n4"):
        data = json.loads(Path(f"/tmp/wordlists/{level}-vocab.json").read_text())
        for x in data:
            ex = (x.get("examples") or [{}])[0]
            push(
                x.get("word") or "",
                x.get("reading") or "",
                ", ".join(x.get("meanings") or []),
                ex.get("ja") or "",
                ex.get("en") or "",
                "生活" if level == "n5" else "N4",
            )
            if len(rows) >= limit:
                return rows
    for level in ("n5", "n4"):
        with open(f"/tmp/wordlists/{level}.csv", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                push(
                    row.get("expression") or "",
                    row.get("reading") or "",
                    row.get("meaning") or "",
                    "",
                    "",
                    "生活" if level == "n5" else "N4",
                )
                if len(rows) >= limit:
                    return rows
    return rows[:limit]


def n4_vocab(limit: int = 1500) -> list[dict]:
    rows = collect_n4_rows(limit)
    pretranslate([r["gloss"] for r in rows])
    items = []
    for i, row in enumerate(rows, 1):
        meaning = zh(row["gloss"])
        items.append(
            {
                "id": f"v{i:03d}",
                "type": "vocab",
                "word": row["word"],
                "reading": row["reading"],
                "meaning": meaning,
                "example": row["example_ja"],
                "exampleMeaning": meaning if not row["example_en"] else meaning,
                "category": row["category"],
            }
        )
    return items


def n4_quiz(vocab: list[dict], grammar: list[dict]) -> list[dict]:
    questions = []
    for i, card in enumerate(vocab[:50], 1):
        distractors = [vocab[(i * 3 + k) % len(vocab)]["meaning"] for k in (2, 5, 9)]
        options = distractors + [card["meaning"]]
        uniq = []
        for o in options:
            if o not in uniq:
                uniq.append(o)
        while len(uniq) < 4:
            uniq.append(f"選項{len(uniq)}")
        answer = uniq.index(card["meaning"])
        questions.append(
            {
                "id": f"q{len(questions)+1:03d}",
                "type": "vocab",
                "prompt": f"「{card['word']}」の意味はどれですか。",
                "options": uniq[:4],
                "answer": answer,
                "explanation": f"{card['word']}（{card['reading']}）＝{card['meaning']}",
            }
        )
    for card in grammar[:30]:
        others = [g for g in grammar if g["id"] != card["id"]][:3]
        options = [o["meaning"] for o in others] + [card["meaning"]]
        uniq = []
        for o in options:
            if o not in uniq:
                uniq.append(o)
        while len(uniq) < 4:
            uniq.append("その他")
        answer = uniq.index(card["meaning"])
        questions.append(
            {
                "id": f"q{len(questions)+1:03d}",
                "type": "grammar",
                "prompt": f"文法「{card['word']}」の意味はどれですか。",
                "options": uniq[:4],
                "answer": answer,
                "explanation": f"{card['word']}：{card['meaning']}（{card['pattern']}）",
            }
        )
    readings = [
        (
            "私は毎日日本語を勉強しています。漢字が難しいですが、諦めずに続けています。来年の N4 に合格したいです。",
            "話者は来年 N4 に合格したい",
            ["漢字が簡単だと思っている", "勉強をやめた", "話者は来年 N4 に合格したい", "週に一度だけ勉強する"],
            2,
        ),
        (
            "駅の近くに新しい図書館ができました。週末は人が多いので、私は平日の夜に行きます。",
            "話者は平日の夜に図書館へ行く",
            ["図書館は駅から遠い", "週末にいつも行く", "話者は平日の夜に図書館へ行く", "図書館はまだない"],
            2,
        ),
        (
            "母が弁当を作ってくれました。朝は忙しいので、とても助かります。",
            "母が弁当を作ってくれた",
            ["話者が母に弁当をあげた", "母が弁当を作ってくれた", "弁当は買った", "朝は暇だ"],
            1,
        ),
        (
            "雨が降りそうなので、傘を持っていきます。天気予報では午後から強くなるそうです。",
            "午後から雨が強くなるらしい",
            ["今は晴れているとしか書いていない", "傘は不要だ", "午後から雨が強くなるらしい", "雪が降る"],
            2,
        ),
        (
            "友達に道を聞いてもらいました。地図が複雑で、一人では分からなかったからです。",
            "友達に道を教えてもらった",
            ["一人で簡単に着いた", "友達に道を教えてもらった", "地図を捨てた", "電車に乗らなかった"],
            1,
        ),
    ]
    for passage, _ok, options, answer in readings:
        questions.append(
            {
                "id": f"q{len(questions)+1:03d}",
                "type": "reading",
                "prompt": "この文の内容と合っているものを選んでください。",
                "passage": passage,
                "options": options,
                "answer": answer,
                "explanation": "關鍵句與正確選項對應。",
            }
        )
    return questions


TOEFL_QUIZ_FOOTER = """
export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function withShuffledOptions(question) {
  const indexed = question.options.map((text, index) => ({ text, index }))
  const shuffled = shuffle(indexed)
  return {
    ...question,
    options: shuffled.map((item) => item.text),
    answer: shuffled.findIndex((item) => item.index === question.answer),
  }
}

export function pickQuiz(count = 8, section = 'all') {
  const pool =
    section === 'all' ? quizQuestions : quizQuestions.filter((q) => q.section === section)
  const entropy = `${Date.now()}-${Math.random()}`
  return shuffle(pool)
    .map((q, i) => ({ q, key: `${entropy}:${i}:${Math.random()}` }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .slice(0, Math.min(count, pool.length))
    .map((item) => withShuffledOptions(item.q))
}
"""

N4_QUIZ_FOOTER = """
export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function pickQuiz(count = 10, type = 'all') {
  const pool =
    type === 'all' ? quizQuestions : quizQuestions.filter((q) => q.type === type)
  return shuffle(pool).slice(0, Math.min(count, pool.length))
}
"""


def emit_practice(readings, listenings, speakings, writings) -> None:
    parts = ["/** Reading / Listening / Speaking / Writing practice items */\n\n"]
    def dump(name, items):
        parts.append(f"export const {name} = {json.dumps(items, ensure_ascii=False, indent=2)}\n\n")
    dump("readingPassages", readings)
    dump("listeningSets", listenings)
    dump("speakingPrompts", speakings)
    dump("writingPrompts", writings)
    (OUT_TOEFL / "practice.js").write_text("".join(parts))


def main() -> None:
    print("Building TOEFL vocabulary…")
    vocab = toefl_vocab(800)
    print("TOEFL vocab", len(vocab), "AWL unique collected", len(AWL_HEADWORDS))
    emit_array(
        OUT_TOEFL / "vocabulary.js",
        "/** @typedef {{ id: string, word: string, phonetic?: string, meaning: string, example: string, exampleMeaning: string, category: string }} VocabCard */\n\n/** @type {VocabCard[]} */\n",
        "vocabulary",
        vocab,
    )

    print("Building TOEFL practice…")
    readings, listenings = toefl_readings(), toefl_listening()
    speakings, writings = toefl_speaking(), toefl_writing()
    emit_practice(readings, listenings, speakings, writings)

    print("Building TOEFL quiz…")
    quiz = toefl_quiz(vocab)
    emit_array(OUT_TOEFL / "quiz.js", "", "quizQuestions", quiz, TOEFL_QUIZ_FOOTER)

    print("Building N4 grammar…")
    grammar = n4_grammar()
    emit_array(
        OUT_N4 / "grammar.js",
        "/** @typedef {{ id: string, type: 'grammar', word: string, reading: string, meaning: string, example: string, exampleMeaning: string, category: string, pattern: string }} GrammarCard */\n\n/** @type {GrammarCard[]} */\n",
        "grammar",
        grammar,
    )

    print("Building N4 vocabulary (this translates many strings)…")
    n4v = n4_vocab(1500)
    emit_array(
        OUT_N4 / "vocabulary.js",
        "/** @typedef {{ id: string, type: 'vocab', word: string, reading: string, meaning: string, example: string, exampleMeaning: string, category: string }} VocabCard */\n\n/** @type {VocabCard[]} */\n",
        "vocabulary",
        n4v,
    )

    print("Building N4 quiz…")
    n4q = n4_quiz(n4v, grammar)
    emit_array(
        OUT_N4 / "quiz.js",
        "/** @typedef {{ id: string, type: 'vocab'|'grammar'|'reading', prompt: string, passage?: string, options: string[], answer: number, explanation: string }} QuizQuestion */\n\n/** @type {QuizQuestion[]} */\n",
        "quizQuestions",
        n4q,
        N4_QUIZ_FOOTER,
    )

    save_cache()
    print("DONE")
    print(
        json.dumps(
            {
                "toeflVocab": len(vocab),
                "reading": len(readings),
                "listening": len(listenings),
                "speaking": len(speakings),
                "writing": len(writings),
                "toeflQuiz": len(quiz),
                "n4Vocab": len(n4v),
                "n4Grammar": len(grammar),
                "n4Quiz": len(n4q),
                "awlHeadwords": len(AWL_HEADWORDS),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
