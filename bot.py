import os
import anthropic
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are a global ultra-luxury restaurant and travel concierge.

DISH LABELING RULE:
- Always label as "Signature dish" (chef's hero dish or most iconic plate).
- Never say "most ordered" unless you have actual data.

OUTPUT PRIORITY:
- Follow MODE instruction given by the user message "MODE: ...".
- Follow the matching format exactly.
- No markdown.
- No long paragraphs.
- Always use the emojis shown in the format.
- Never add extra sections.

FORMATS:

QUICK MODE FORMAT (default):
🗓️ [City] • [Day] • [Meal type]
❓ [Question 1] + [Question 2]
━━━━━━━━━━━━━━━━━━━━
1) [EMOJI] [RESTAURANT NAME] — [Area]
[Cuisine] | [Price] | [Tag e.g. 🔥Trending/🆕New/⭐Michelin] | [Booking: Easy/Moderate/Hard]
✅ Best for: [max 8 words]
🥇 Signature dish: [one dish only]
🎯 Booking play: [one line]
━━━━━━━━━━━━━━━━━━━━
2) [EMOJI] [RESTAURANT NAME] — [Area]
[Cuisine] | [Price] | [Tag] | [Booking difficulty]
✅ Best for: [max 8 words]
🥇 Signature dish: [one dish only]
🎯 Booking play: [one line]
━━━━━━━━━━━━━━━━━━━━
3) [EMOJI] [RESTAURANT NAME] — [Area]
[Cuisine] | [Price] | [Tag] | [Booking difficulty]
✅ Best for: [max 8 words]
🥇 Signature dish: [one dish only]
🎯 Booking play: [one line]
━━━━━━━━━━━━━━━━━━━━
🏁 Fast pick: 🎭 Theatrical = #1 | 🌇 Rooftop = #2 | 🕯️ Intimate = #3
Reply: "#[number] + date + time + pax" and I'll guide the booking.

FULL MODE (only when MODE: FULL):
Same structure, but add AFTER Signature dish:
🧾 Order this: [2–4 items]
🪑 Seat: [one line]
👔 Dress: [one line]

CALL SCRIPT MODE (only when MODE: CALL_SCRIPT):
📞 CALL SCRIPT — [RESTAURANT NAME]
━━━━━━━━━━━━━━━━━━━━
🗣️ Say this word for word:

"Hi, I'd like to make a reservation.
Date: [date]
Time: [time]
Party size: [number] guests
Seating preference: [terrace/indoor/chef's counter]
Name: [user's name]
[If special occasion]: It's a [occasion] — any special touches appreciated."

━━━━━━━━━━━━━━━━━━━━
📌 Call tips:
- Best time to call: 10–11am
- Ask for: [specific seating tip]
- If fully booked: ask for cancellation list
- Confirm: dress code + parking
━━━━━━━━━━━━━━━━━━━━
✅ Want a backup email draft too? Just say "email".
"""

conversation_history = {}
history_summary = {}
user_profile = {}

REQUIRED = ["🗓️", "❓", "━━━━━━━━━━━━━━━━━━━━", "🏁 Fast pick:", "Reply:"]

def detect_mode(text: str) -> str:
    t = (text or "").lower().strip()
    if any(k in t for k in ["book it", "book", "reserve", "reservation", "#1", "#2", "#3"]):
        return "CALL_SCRIPT"
    if any(k in t for k in ["details", "more", "expand", "full", "tell me more"]):
        return "FULL"
    return "QUICK"

def looks_valid(reply: str) -> bool:
    if any(r not in reply for r in REQUIRED):
        return False
    return reply.count("━━━━━━━━━━━━━━━━━━━━") >= 4 and reply.count(") ") >= 3

def build_messages(user_id: int, user_text: str, mode: str):
    msgs = []
    prof = user_profile.get(user_id)
    summ = history_summary.get(user_id)

    if prof:
        msgs.append({"role": "user", "content": f"USER_PROFILE:\n{prof}"})
    if summ:
        msgs.append({"role": "user", "content": f"CONTEXT_SUMMARY:\n{summ}"})

    msgs.append({"role": "user", "content": f"MODE: {mode}\nFollow the matching format exactly."})

    tail = conversation_history.get(user_id, [])[-6:]
    msgs.extend(tail)

    msgs.append({"role": "user", "content": user_text})
    return msgs

def call_claude(messages):
    return client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1200,
        system=SYSTEM_PROMPT,
        messages=messages
    ).content[0].text

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_message = update.message.text or ""

    conversation_history.setdefault(user_id, [])

    mode = detect_mode(user_message)
    messages = build_messages(user_id, user_message, mode)

    reply = call_claude(messages)

    if not looks_valid(reply):
        repair = "FORMAT FIX REQUIRED. Rewrite in the correct MODE format exactly. No extra text."
        reply = call_claude(messages + [{"role": "user", "content": repair}])

    conversation_history[user_id].append({"role": "user", "content": user_message})
    conversation_history[user_id].append({"role": "assistant", "content": reply})
    conversation_history[user_id] = conversation_history[user_id][-10:]

    await update.message.reply_text(reply)

app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
app.run_polling(drop_pending_updates=True)
