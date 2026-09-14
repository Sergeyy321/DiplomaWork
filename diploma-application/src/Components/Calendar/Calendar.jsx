// import React, { useState, useEffect } from "react";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";

// export default function CalendarNote() {
//   const [date, setDate] = useState(new Date());
//   const [events, setEvents] = useState([]);
//     const [isOpen, setIsOpen] = useState(false);
//   const [selectedDate, setSelectedDate] = useState(null);

//    const [form, setForm] = useState({
//     title: "",
//     time: "12:00",
//     color: "blue",
//     reminder: false,
//   });

//   // 📅 клик по дню
//   const handleDateClick = (date) => {
//     setSelectedDate(date);
//     setIsOpen(true);
//   };

//   // 💾 сохранить
//   const handleSubmit = () => {
//     const fullDate = new Date(selectedDate);
//     const [h, m] = form.time.split(":");

//     fullDate.setHours(h);
//     fullDate.setMinutes(m);

//     setEvents([
//       ...events,
//       {
//         id: Date.now(),
//         date: selectedDate.toISOString().split("T")[0],
//         fullDate,
//         ...form,
//       },
//     ]);

//     setIsOpen(false);
//     setForm({ title: "", time: "12:00", color: "blue", reminder: false });
//   };
// const deleteNotification = (id) => {
//   setEvents(events.filter((e) => e.id !== id));
// };
// const editNottification = (id) => {
// setDate()
// setEvent()
// };

//   return (
//     <div style={{ maxWidth: 500, margin: "auto" }}>
//       <Calendar
//         onChange={setDate}
//         value={date}
//         onClickDay={handleDateClick}
//         tileContent={({ date }) => {
//           const dayEvents = events.filter(
//             (e) =>
//               e.date === date.toISOString().split("T")[0]
//           );

//           return (
//             <div>
//               {dayEvents.map((event) => (
//                 <div
//                   key={event.id}
//                   style={{
//                     background: event.color,
//                     color: "white",
//                     fontSize: "10px",
//                     marginTop: "2px",
//                     borderRadius: "4px",
//                     padding: "2px",
//                   }}
//                 >
//                   <button
//                     onClick={(e) => {
//               e.stopPropagation(); // ❗ чтобы не срабатывал клик по дню
//               deleteNotification(event.time,event.title);
//             }}
          
                  
                  
//                   >
//                               <span>

//             {event.time} {event.title}
//           </span>

//                     <button/>
        
//           <button
//             onClick={(e) => {
//               e.stopPropagation(); // ❗ чтобы не срабатывал клик по дню
//               deleteNotification(event.id);
//             }}
//             style={{
//               marginLeft: 5,
//               fontSize: "10px",
//               cursor: "pointer",
//             }}
//           >
//             ❌
//           </button>
//                 </div>
//               ))}
//             </div>
//           );
//         }}
//       />


//       {isOpen && (
//         <div style={overlayStyle}>
//           <div style={modalStyle}>
//             <h3>New event</h3>

//             <input
//               placeholder="Title"
//               value={form.title}
//               onChange={(e) =>
//                 setForm({ ...form, title: e.target.value })
//               }
//             />

//             <input
//               type="time"
//               value={form.time}
//               onChange={(e) =>
//                 setForm({ ...form, time: e.target.value })
//               }
//             />

//             <select
//               value={form.color}
//               onChange={(e) =>
//                 setForm({ ...form, color: e.target.value })
//               }
//             >
//               <option value="blue">BLue</option>
//               <option value="red">Red</option>
//               <option value="green">Green</option>
//             </select>

//             <label>
//               <input
//                 type="checkbox"
//                 checked={form.reminder}
//                 onChange={(e) =>
//                   setForm({
//                     ...form,
//                     reminder: e.target.checked,
//                   })
//                 }
//               />
//               Nottification
//             </label>

//             <div style={{ marginTop: 10 }}>
//               <button onClick={handleSubmit}>Save</button>
//               <button onClick={() => setIsOpen(false)}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // стили
// const overlayStyle = {
//   position: "fixed",
//   top: 0,
//   left: 0,
//   right: 0,
//   bottom: 0,
//   background: "rgba(0,0,0,0.5)",
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
// };

// const modalStyle = {
//   background: "white",
//   padding: 20,
//   borderRadius: 8,
//   display: "flex",
//   flexDirection: "column",
//   gap: 10,
// };