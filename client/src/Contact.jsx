import Avatar from "./Avatar";

export default function Contact({ id, username, onClick, selected, online }) {
  return (
    <div key={id} onClick={() => onClick(id)} className={"border-b borde-gray-100 flex cursor-pointer " + (selected ? "bg-blue-50" : "")}>
      {id === selected && <div className="w-1 bg-blue-500 h-15 rounded-r-md -mr-1"></div>}
      <div className="flex gap-2 items-center pl-4 py-2">
        <Avatar online={online} username={username} userId={id} />
        <span className="text-gray-800">{username}</span>
      </div>
    </div>
  );
}
