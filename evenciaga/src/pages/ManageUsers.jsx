import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";

function ManageUsers() {

  const navigate =
    useNavigate();
  const [users, setUsers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  useEffect(() => {

    fetchUsers();

  }, []);

  const fetchUsers =
    async () => {

      const snapshot =
        await getDocs(
          collection(
            db,
            "users"
          )
        );

      const data =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data()
          })
        );

      setUsers(data);

    };

  const deleteUser =
    async (id) => {

      const ok =
        window.confirm(
          "Delete this user?"
        );

      if (!ok) return;

      await deleteDoc(
        doc(
          db,
          "users",
          id
        )
      );

      fetchUsers();

    };
const suspendUser =
  async (id) => {

    const ok =
      window.confirm(
        "Suspend this user?"
      );

    if (!ok) return;

    try {

      await updateDoc(
        doc(
          db,
          "users",
          id
        ),
        {
          accountStatus:
            "suspended"
        }
      );

      alert(
        "User Suspended Successfully"
      );

      fetchUsers();

    } catch (error) {

      console.log(error);

      alert(
        "Failed to Suspend User"
      );

    }

  };
  const activateUser =
  async (id) => {

    const ok =
      window.confirm(
        "Activate this user?"
      );

    if (!ok) return;

    try {

      await updateDoc(
        doc(
          db,
          "users",
          id
        ),
        {
          accountStatus:
            "active"
        }
      );

      alert(
        "User Activated Successfully"
      );

      fetchUsers();

    } catch (error) {

      console.log(error);

      alert(
        "Failed to Activate User"
      );

    }

  };
  const filteredUsers =
  search.trim() === ""
    ? users
    : users.filter(
        (user) =>
          user.name
            ?.toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          user.email
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
        👥 Manage Users
      </h1>

      <input
        placeholder="Search by Name or Email..."
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

        filteredUsers.map(
          (user)=>(

            <div
              key={user.id}
              style={{
                border:"1px solid #ddd",
                padding:"20px",
                marginBottom:"15px",
                borderRadius:"10px"
              }}
            >

             <h3>
  {user.name}
</h3>

<p>
  {user.email}
</p>

<p>
  Role: {user.role || "Volunteer"}
</p>
<p>
  Account Status:
  {" "}

  <strong
    style={{
      color:
        user.accountStatus ===
        "active"
          ? "green"
          : "red"
    }}
  >
    {user.accountStatus}
  </strong>

</p>

<button
  onClick={() =>
    navigate(
      `/user-details/${user.id}`
    )
  }
>
  View Details
</button>
{
  user.accountStatus ===
  "suspended" ? (

    <button
      onClick={() =>
        activateUser(
          user.id
        )
      }
    >
      Activate
    </button>

  ) : (

    <button
      onClick={() =>
        suspendUser(
          user.id
        )
      }
    >
      Suspend
    </button>

  )
}

{
  user.role !== "admin" && (

    <button
      onClick={() =>
        deleteUser(user.id)
      }
    >
      Delete
    </button>

  )
}
            </div>

          )
        )

      }

    </div>

  );

}

export default ManageUsers;