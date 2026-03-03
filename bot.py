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

MODE RULES:
- Default = Quick Mode
- If user says "details" or "more" = Full Mode

QUICK MODE FORMAT (use this by default, no exceptions):
Copy this structure exactly, including all emojis:

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

FULL MODE FORMAT (only when user says "details"):
Same structure but add after Signature dish:
🧾 Order this: [2-4 items]
🪑 Seat: [one line]
👔 Dress: [one line]

STRICT RULES:
- ALWAYS use the emojis shown above. Never skip them.
- NO markdown (no ## or ** or ---)
- NO long paragraphs
- NO bullet points inside cards
- Each card = maximum 6 lines in Quick Mode
- Tone: sophisticated, concierge, never generic"""

conversation_history = {}

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_message = update.message.text

    if user_id not in conversation_history:
        conversation_history[user_id] = []

    conversation_history[user_id].append({
        "role": "user",
        "content": user_message
    })

    if len(conversation_history[user_id]) > 10:
        conversation_history[user_id] = conversation_history[user_id][-10:]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=conversation_history[user_id]
    )

    reply = response.content[0].text

    conversation_history[user_id].append({
        "role": "assistant",
        "content": reply
    })

    await update.message.reply_text(reply)

app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
app.run_polling(drop_pending_updates=True)
