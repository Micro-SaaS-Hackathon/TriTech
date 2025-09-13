import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; 

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const times = [
  "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30"
];

const normalizeSchedule = (items: any[]) => {
  const result: any[] = [];

  items.forEach((item) => {
    item.meetingTimes.forEach((mt: any) => {
      Object.entries(mt.days).forEach(([day, active]) => {
        if (active) {
          result.push({
            day: day.charAt(0).toUpperCase() + day.slice(1), 
            subject: item.title,
            teacher: mt.instructor || item.instructor || "",
            start: `${mt.startHour.toString().padStart(2, "0")}:${mt.startMinute
              .toString()
              .padStart(2, "0")}`,
            end: `${mt.endHour.toString().padStart(2, "0")}:${mt.endMinute
              .toString()
              .padStart(2, "0")}`,
            color: item.backgroundColor
              ? `bg-[${item.backgroundColor}]`
              : "bg-blue-400",
            location: mt.location || "",
          });
        }
      });
    });
  });

  return result;
};


const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
   
    const q = query(
      collection(db, "responses"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0].data();
        try {
          const parsed = JSON.parse(doc.response);
          const items = parsed?.scheduleState?.items || [];
          setSchedule(normalizeSchedule(items));
        } catch (err) {
          console.error("Ошибка парсинга JSON:", err);
          setError("Invalid schedule format");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (error) {
    return <div className="text-red-400 p-4">{error}</div>;
  }

  if (schedule.length === 0) {
    return <div className="text-gray-400 p-4">Нет данных для отображения</div>;
  }

  return (
    <div className="p-6 overflow-x-auto">
      <h1 className="text-2xl font-semibold mb-4 text-white">Schedule</h1>
      <div className="grid grid-cols-[100px_repeat(5,1fr)] border border-gray-700">

  
        <div className="bg-gray-800 text-gray-200 flex items-center justify-center border border-gray-700">
          Time
        </div>
        {days.map((day) => (
          <div
            key={day}
            className="bg-gray-800 text-gray-200 flex items-center justify-center border border-gray-700"
          >
            {day}
          </div>
        ))}

  
        {times.map((time) => (
          <React.Fragment key={time}>
     
            <div className="border border-gray-700 text-sm text-gray-300 flex items-center justify-center">
              {time}
            </div>

            {days.map((day) => {
              const event = schedule.find(
                (e) => e.day === day && e.start === time
              );

              if (event) {
                const startM = toMinutes(event.start);
                const endM = toMinutes(event.end);
                const span = (endM - startM) / 30;

                return (
                  <div
                    key={day + time}
                    className={`border border-gray-700 p-1 text-xs ${event.color}`}
                    style={{ gridRowEnd: `span ${span}` }}
                  >
                    <div className="font-bold">{event.subject}</div>
                    {event.teacher && <div>{event.teacher}</div>}
                    <div className="text-[10px]">
                      {event.start} - {event.end}
                    </div>
                    {event.location && (
                      <div className="text-[10px]">{event.location}</div>
                    )}
                  </div>
                );
              }

              const covered = schedule.some((e) => {
                const startM = toMinutes(e.start);
                const endM = toMinutes(e.end);
                const slotM = toMinutes(time);
                return e.day === day && slotM > startM && slotM < endM;
              });
              if (covered) return null;

              return (
                <div
                  key={day + time}
                  className="border border-gray-700 hover:bg-gray-900"
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Schedule;
