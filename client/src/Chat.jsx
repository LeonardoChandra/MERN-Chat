import { useContext, useEffect, useState, useRef } from "react";
import Avatar from "./Avatar";
import { UserContext } from "./UserContext";
import lodash, { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setUsername, setId } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    connectedToWs();
  }, [selectedUserId]);

  function connectedToWs() {
    const ws = new WebSocket("ws://localhost:4000");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected. Trying to reconnect!");
        connectedToWs();
      }, 1000);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  }

  function sendMessage(ev, file = null) {
    if (ev) ev.preventDefault();
    ws.send(JSON.stringify({ recipient: selectedUserId, text: newMessageText, file }));
    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [...prev, { text: newMessageText, sender: id, recipient: selectedUserId, _id: Date.now() }]);
    }
  }

  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data.filter((p) => p._id !== id).filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const onlinePeopleExcOurUser = { ...onlinePeople };
  delete onlinePeopleExcOurUser[id];

  const messageWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <div className="bg-blue-300 p-4 mb-1 flex items-center gap-2">
            <Avatar online={true} username={username} userId={id} />
            <span>{username}</span>
          </div>
          {Object.keys(onlinePeopleExcOurUser).map((userId) => (
            <Contact key={userId} id={userId} online={true} username={onlinePeopleExcOurUser[userId]} onClick={() => setSelectedUserId(userId)} selected={userId === selectedUserId} />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <Contact key={userId} id={userId} online={false} username={offlinePeople[userId].username} onClick={() => setSelectedUserId(userId)} selected={userId === selectedUserId} />
          ))}
        </div>
        <div className="p-2 text-center">
          <button onClick={logout} className="text-sm text-white bg-blue-500 px-2 py-2 rounded-lg border">
            logout
          </button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && <div className="flex h-full items-center justify-center opacity-50">&larr; Select a person to start chatting!</div>}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messageWithoutDupes.map((message) => (
                  <div key={message._id} className={message.sender === id ? "text-right" : "text-left"}>
                    <div className={"text-left inline-block p-2 my-0.5 rounded-md text-sm " + (message.sender === id ? "bg-blue-500 text-white" : "bg-white text-gray-500")}>
                      {message.text}
                      {message.file && (
                        <div className="">
                          <img
                            src={axios.defaults.baseURL + "/uploads/" + message.file}
                            className="w-auto h-auto object-contain max-w-xs max-h-60 cursor-pointer rounded-md"
                            onClick={() => {
                              window.open(axios.defaults.baseURL + "/uploads/" + message.file);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>

        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input className="flex-grow px-4 py-2 rounded-3xl" type="text" value={newMessageText} onChange={(ev) => setNewMessageText(ev.target.value)} placeholder="Type a message..." />
            <label className="bg-gray-200 p-2 text-gray-500 cursor-pointer">
              <input type="file" className="hidden" onChange={sendFile} />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </label>
            <button type="submit" className="bg-blue-500 p-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
