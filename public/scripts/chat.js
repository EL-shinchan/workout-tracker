document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const promptChips = Array.from(document.querySelectorAll(".prompt-chip"));

  const foods = [
    { name: "large egg", aliases: ["egg", "eggs"], serving: "1 large egg", protein: 6, calories: 70 },
    { name: "banana", aliases: ["banana", "bananas"], serving: "1 medium banana", protein: 1.3, calories: 105 },
    { name: "chicken breast", aliases: ["chicken", "chicken breast"], serving: "100g cooked chicken breast", protein: 31, calories: 165 },
    { name: "cooked rice", aliases: ["rice", "cooked rice", "white rice"], serving: "1 cup cooked rice", protein: 4.3, calories: 205 },
    { name: "milk", aliases: ["milk"], serving: "1 cup milk", protein: 8, calories: 150 },
    { name: "oats", aliases: ["oat", "oats", "oatmeal"], serving: "1/2 cup dry oats", protein: 5, calories: 150 },
    { name: "greek yogurt", aliases: ["greek yogurt", "yogurt"], serving: "170g greek yogurt", protein: 17, calories: 100 },
    { name: "peanut butter", aliases: ["peanut butter", "pb"], serving: "2 tbsp peanut butter", protein: 8, calories: 190 },
    { name: "tuna", aliases: ["tuna"], serving: "1 can tuna", protein: 25, calories: 120 },
    { name: "apple", aliases: ["apple", "apples"], serving: "1 medium apple", protein: 0.5, calories: 95 }
  ];

  const workoutAnswers = [
    {
      keys: ["bench press", "bench"],
      answer: "Bench press is a chest exercise where you press weight upward while lying on a bench. Start light, control the bar, and use a spotter when it gets heavy."
    },
    {
      keys: ["squat", "squats"],
      answer: "A squat trains legs and glutes by bending your knees and hips, then standing back up. Keep your chest tall, brace your core, and use a weight you can control."
    },
    {
      keys: ["deadlift", "dead lift"],
      answer: "Deadlift is a hip-hinge lift where you pick weight up from the floor. Keep your back neutral, push through the floor, and do not rush heavy weight."
    },
    {
      keys: ["pull up", "pull-up", "pullup"],
      answer: "A pull-up trains your back and arms by pulling your body up to a bar. If full pull-ups are hard, use assisted pull-ups or slow negatives."
    },
    {
      keys: ["row", "rows"],
      answer: "Rows train your back by pulling weight toward you. Think: chest proud, shoulders down, pull with elbows, not just hands."
    },
    {
      keys: ["sets", "beginner", "how many sets"],
      answer: "For beginners, 2–3 working sets per exercise is usually enough. Leave 1–3 reps in the tank and focus on clean form first."
    },
    {
      keys: ["reps", "muscle", "hypertrophy"],
      answer: "For building muscle, 6–12 reps is a solid default. Higher reps can work too if the set is controlled and close to challenging."
    },
    {
      keys: ["train every day", "workout every day", "lift every day"],
      answer: "You can move every day, but hard lifting every day is usually too much for beginners. Train 3–4 days a week and let muscles recover."
    }
  ];

  const numberWords = new Map([
    ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
    ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10]
  ]);

  function addMessage(role, text) {
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;
    const label = document.createElement("span");
    label.className = "chat-message-label";
    label.textContent = role === "bot" ? "Coach Fox" : "You";
    const bubble = document.createElement("p");
    bubble.textContent = text;
    message.append(label, bubble);
    chatMessages.append(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s.-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function quantityFor(text, food) {
    for (const alias of food.aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const digitMatch = text.match(new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s+${escapedAlias}(?:\\s|$)`));
      if (digitMatch) {
        return Number(digitMatch[1]);
      }

      for (const [word, value] of numberWords.entries()) {
        if (new RegExp(`(?:^|\\s)${word}\\s+${escapedAlias}(?:\\s|$)`).test(text)) {
          return value;
        }
      }
    }

    return 1;
  }

  function findFood(text) {
    return foods.find((food) => food.aliases.some((alias) => text.includes(alias)));
  }

  function nutritionAnswer(rawQuestion) {
    const question = normalize(rawQuestion);
    const food = findFood(question);
    if (!food) {
      return null;
    }

    const quantity = quantityFor(question, food);
    const protein = food.protein * quantity;
    const calories = food.calories * quantity;
    const qtyText = quantity === 1 ? food.serving : `${quantity} × ${food.serving}`;
    const proteinText = Number.isInteger(protein) ? protein : protein.toFixed(1);
    const calorieText = Math.round(calories);

    return `${qtyText} has about ${proteinText}g protein and ${calorieText} calories. Simple estimate, but good enough for daily tracking. 🦊`;
  }

  function workoutAnswer(rawQuestion) {
    const question = normalize(rawQuestion);

    if (/pain|injur|hurt|doctor|medical|sick/.test(question)) {
      return "If there is pain, injury, or medical stuff involved, ask a real doctor, physio, or coach. Coach Fox can help with basics, not diagnosis.";
    }

    const exact = workoutAnswers.find((entry) => entry.keys.some((key) => question.includes(key)));
    if (exact) {
      return exact.answer;
    }

    return null;
  }

  function answerQuestion(question) {
    const cleaned = normalize(question);
    if (!cleaned) {
      return "Ask me a food or workout question.";
    }

    return nutritionAnswer(cleaned)
      || workoutAnswer(cleaned)
      || "I don't know that yet — ask Shinoske to add it.";
  }

  function submitQuestion(question) {
    const text = String(question || "").trim();
    if (!text) {
      addMessage("bot", answerQuestion(text));
      return;
    }

    addMessage("user", text);
    addMessage("bot", answerQuestion(text));
    chatInput.value = "";
    chatInput.focus();
  }

  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submitQuestion(chatInput.value);
  });

  promptChips.forEach((chip) => {
    chip.addEventListener("click", function () {
      submitQuestion(chip.textContent);
    });
  });

  addMessage("bot", "Hey, I’m Coach Fox. Ask me simple food or beginner workout questions — like protein in eggs or what bench press means.");
});
