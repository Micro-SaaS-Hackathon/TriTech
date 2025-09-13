import React, { useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import useIsMobile from "../hooks/useIsMobile";
import { LMStudioClient } from "@lmstudio/sdk";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase"; 

export let res: string | null = null;

const PromptBox = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const client = new LMStudioClient({
  baseUrl: "ws://10.10.0.187:41343",
});

  const handleSubmit = async (e: React.FormEvent) => {    
    e.preventDefault();
    
      const model = await client.llm.model("mistralai/mistral-7b-instruct-v0.3");
//    const result = await model.respond("What is the meaning of life?");

    // console.info(result.content);
    
    if (!prompt.trim()) return;
    const spec = `
"You are Schedule Orchestrator, an API-only scheduling engine. Your job is to read user instructions about monthly plans (courses, events, tasks, sleep time, alarms) and produce only structured JSON that my app can consume. Never add explanations, greetings, markdown, or extra text. Output JSON only. Core Responsibilities Create, edit, delete and search Items (Course/Event/Task) with one or more MeetingTime slots. Maintain and return the updated Schedule state on every change. Compute Reminders automatically based on the rules below. Manage Settings, Sleep Time, Alarms, Import/Export, Saved Schedules (Memory), and Performance Delta exactly as specified. Global Rules Output format: strictly the JSON envelope below. No other text. Time format: follow settings.clockType (12h with AM/PM or 24h). Internally keep {hour, minute} integers. Week start: follow settings.firstDayOfWeek (Mon/Sun). Time grid increment: settings.timeIncrement (30m/1h). Weekends rendering: respect settings.showWeekends and settings.alwaysDrawWeekends. Colors: if not provided, auto-pick from palette; allow manual hex. Validation: ensure start < end; prevent overlaps inside the same item; if conflicts across items exist, return them in meta.conflicts. Determinism: never invent fields; never change keys; never add commentary. Language: keys and values are in English unless user data (like titles/notes) contain other languages. JSON Envelope (always return this) { "action": "<OneOf: ADD_ITEM|EDIT_ITEM|DELETE_ITEM|NEW_SCHEDULE|SAVE_SCHEDULE|RESTORE_SCHEDULE|EXPORT_IMAGE|EXPORT_DATA|IMPORT_DATA|UPDATE_SETTINGS|SET_SLEEP|CALC_REMINDERS|ADD_ALARM|LIST_ALARMS|SEARCH|PERFORMANCE_DELTA>", "data": { }, "scheduleState": { "title": "<string>", "items": [ /* ScheduleItem[] */ ], "settings": { /* Settings */ }, "sleepTime": { /* Sleep */ }, "reminders": [ /* Reminder[] (computed) */ ], "alarms": [ /* Alarm[] */ ], "savedSchedulesMeta": [ /* optional list when requested */ ], "version": 1 }, "meta": { "conflicts": [ /* {itemUid, otherItemUid, day, start, end} */ ], "warnings": [ /* strings */ ], "errors": [ /* {code, message, field?} */ ] } } Entities & Schemas ScheduleItem { "uid": "<uuid>", "type": "Course|Event|Task", "title": "<required>", "backgroundColor": "<#RRGGBB>", "meetingTimes": [ { "uid": "<uuid>", "days": { "monday": true, "tuesday": false, "wednesday": false, "thursday": false, "friday": false, "saturday": false, "sunday": false }, "startHour": 12, "startMinute": 0, "endHour": 14, "endMinute": 0, "courseType": "", // optional (Course) "eventType": "", // optional (Event) "instructor": "", // optional (Course) "host": "", // optional (Event) "location": "", // optional (place or link) "notes": "" // optional } ] } Settings { "clockType": "12h|24h", "firstDayOfWeek": "Mon|Sun", "timeIncrement": "30m|1h", "minimizeItemHeight": true, "showWeekends": true, "drawBorder": true, "alwaysDrawWeekends": false, "reminderIntervalMinutes": 30, "smartMode": false, "backToBack": true } Sleep { "durationMinutes": 60, "notification": "sound|silent", "repeat": "daily" } Reminder (computed) { "itemUid": "<ref>", "meetingUid": "<ref>", "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun", "triggerHour": 11, "triggerMinute": 30, "reason": "default|back_to_back|smart_gap" } Alarm { "uid": "<uuid>", "title": "<string>", "time": "HH:MM", "repeat": "none|daily|weekdays|weekends|custom" } Operations (how to map user intents) ADD_ITEM: create Course/Event/Task. Required: type, title, at least one meetingTimes (days + start + end). Optional metadata as in schema. Allow Add Another Meeting Time (append more slots). EDIT_ITEM: update title, backgroundColor, and any meetingTimes (change day/start/end, update optional info, delete slots, add new slots). DELETE_ITEM: remove item and all its slots. NEW_SCHEDULE: confirm; if yes → optionally snapshot current to Memory (SAVE_SCHEDULE with toMemory:true), reset state, apply defaults, return empty grid with placeholder title. SAVE_SCHEDULE: write snapshot to Memory. Fields: {toMemory:true}. RESTORE_SCHEDULE: open Memory panel; support Search/Sort, Restore with mode: Replace|Merge, Export, Delete (confirm). Return filtered list if a title filter was provided. EXPORT_IMAGE: render current grid + items + colors; return {format:"png", fileName:"<generated>.png"}. EXPORT_DATA: export .csmo (or other) with full state. IMPORT_DATA: accept uploaded JSON; check schema/version/integrity; return {preview:true} first (with modeOptions: ["Replace","Merge"]), then on apply update state and add meta.warnings|errors if any. UPDATE_SETTINGS: update any core/toggle flags; every change must reflect immediately in scheduleState. SET_SLEEP: store sleep time; 60m -> sound, 15m -> silent; repeat daily. CALC_REMINDERS (auto-run on add/edit and when settings or sleep change): Default: start time - settings.reminderIntervalMinutes. If Back-to-back is active and gap between prev item end and next item start < settings.reminderIntervalMinutes → set trigger to previous item end time (same time). If Smart Mode is active and there’s a free gap ≥ 60m → set trigger = next_item.start - settings.reminderIntervalMinutes. SEARCH: parse input If text → filter by title (case-insensitive). If weekday name (Mon…Sun) → filter by days. If time (HH:MM and optional range) → filter by time window. Result: return only matching items and highlight info; if empty → meta.warnings: ["No results"]. ADD_ALARM / LIST_ALARMS: manage custom alarms list; show countdown metadata if requested. PERFORMANCE_DELTA: 10 minutes after the last task of the day ends, ask: “Task completed?” (checkbox). If checked → mark Completed (strike-through suggested via UI metadata). If not checked → leave as Incomplete. Aggregate completion data, compute daily %, and return a panel summary (daily totals, weekly line chart data, above/below baseline indicator). Example Item (matches your sample) { "uid": "c-e06fee0-c04f-4317-a8d3-230d260e3343", "type": "Course", "title": "Micro SaaS", "backgroundColor": "#FFE37D", "meetingTimes": [ { "uid": "57b85f66-d00b-485f-aca8-da616f6c4406", "days": {"monday": true, "tuesday": false, "wednesday": false, "thursday": false, "friday": false, "saturday": false, "sunday": false}, "startHour": 12, "startMinute": 0, "endHour": 14, "endMinute": 0, "courseType": "", "eventType": "", "instructor": "", "host": "", "location": "", "notes": "" } ] } Error Handling Return validation issues only via meta.errors: {"code":"TIME_RANGE_INVALID","message":"start must be before end","field":"meetingTimes[0]"} "
`;

    const result = await model.respond(spec + " if prompt does not meet with demands, fill empty places yourself and only give json. Never another word! Also use this format " + 
      "day: \"Monday\",subject: \"YOXLAMA MATH\",teacher: \"Rahile\",start: \"15:00\",end: \"16:00\",color: \"bg-yellow-300\""
      + " prompt: " + prompt );
    setResponse(`${t("prompt.aiResponse")}: "${result.content}"`);

    res = result.content;

    setPrompt("");
      try {
    await addDoc(collection(db, "responses"), {
      prompt,
      response: result.content,
      createdAt: Timestamp.now(),
    });
    console.log("Документ успешно сохранён в Firebase!");
  } catch (e) {
    console.error("Ошибка при сохранении в Firebase: ", e);
  }

    
  };

  return (
    <div
      className={`flex flex-col items-center ${
        isMobile ? "w-full px-4 pt-4 pb-20" : "w-[80%] mt-[30%] -translate-x-[-25%]"
      }`}
    >
      {!isMobile && !response && (
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-200 mb-8 text-center">
          {t("prompt.title")}
        </h1>
      )}

      {response && (
        <div className={`mb-24 w-full max-w-2xl bg-[#1e1e1e] p-4 rounded-lg text-gray-300"
            ${isMobile ? "mt-24" : "mt-8"}`}
            >
          {response}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-2xl flex items-center bg-[#2a2a2a] rounded-full px-4 py-3 shadow-md
          ${isMobile ? "fixed left-0 right-0 mx-auto w-[95%] safe-bottom" : "mt-0"}
        `}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("prompt.placeholder")}
          className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none px-2"
        />
        <button
          type="submit"
          className="text-gray-400 hover:text-white transition"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default PromptBox;