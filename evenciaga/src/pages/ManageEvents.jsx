import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function ManageEvents() {

  const [events, setEvents] =
    useState([]);

  const [search, setSearch] =
    useState("");

  useEffect(() => {

    fetchEvents();

  }, []);

  const fetchEvents =
    async () => {

      const snapshot =
        await getDocs(
          collection(
            db,
            "events"
          )
        );

      const data =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data()
          })
        );

      setEvents(data);

    };

  const deleteEvent =
    async (id) => {

      const ok =
        window.confirm(
          "Delete this event?"
        );

      if (!ok) return;

      await deleteDoc(
        doc(
          db,
          "events",
          id
        )
      );

      fetchEvents();

    };

  const filteredEvents =
    search.trim() === ""
      ? events
      : events.filter(
          (event) =>
            event.title
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              )
        );

  return (

    <div
      style={{
        maxWidth: "1100px",
        margin: "30px auto",
        padding: "20px"
      }}
    >
      <BackButton />

      <h1>
        📅 Manage Events
      </h1>

      <input
        placeholder="Search Event..."
        value={search}
        onChange={(e)=>
          setSearch(
            e.target.value
          )
        }
        style={{
          padding:"10px",
          width:"300px",
          marginBottom:"20px"
        }}
      />

      {

        filteredEvents.map(
          (event)=>(

            <div
              key={event.id}
              style={{
                border:"1px solid #ddd",
                borderRadius:"10px",
                padding:"20px",
                marginBottom:"15px"
              }}
            >

              <h3>
                {event.title}
              </h3>

              <p>
                📍 {event.location}
              </p>

              <p>
                📅 {event.date}
              </p>

              <p>
                Status: {event.status}
              </p>

              <p>
                Organizer: {event.organizerEmail}
              </p>

              <button
                onClick={()=>
                  deleteEvent(event.id)
                }
              >
                Delete Event
              </button>

            </div>

          )
        )

      }

    </div>

  );

}

export default ManageEvents;