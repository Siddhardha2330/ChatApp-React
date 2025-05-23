import React from "react";
import "./chatList.css";
import AddUser from "./addUser/addUser";
import { useUserStore } from "../../../lib/userStore";
import { db } from "../../../lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useChatStore } from "../../../lib/chatStore";

const ChatList = () => {

  const [chats,setChats]=React.useState([]);
  const [addMode,setAddMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const {currentUser}=useUserStore();
  const {changeChat,chatId}=useChatStore();
  
  React.useEffect(()=>{
    const unSub=onSnapshot(doc(db, "userchats",currentUser.id), async(res) => {
    if (!res.data()) {
      setChats([]);
      return;
    }
    
    const items = res.data().chats || [];
    const promises = items.map(async(item)=>{
      const userDocRef = doc(db, "users", item.receiverId);
      const userDocSnap = await getDoc(userDocRef);
      const user = userDocSnap.data();
      return {
        ...item, user
      }
    });
    const chatData = await Promise.all(promises);
    setChats(chatData.sort((a,b) => b.updatedAt - a.updatedAt));
  });

  return ()=>unSub();
  }
  ,[currentUser.id]);

  const handleSelect=async(chat)=>{
   const userChats=chats.map((item)=>{
    const {user,...rest}=item;
    return rest;
   })
   const chatIndex=userChats.findIndex((item)=>item.chatId===chat.chatId);
   userChats[chatIndex].isSeen=true;
   const userChatRef=doc(db,"userchats",currentUser.id);
   try{
    await updateDoc(userChatRef,{
      chats:userChats,
    });
    changeChat(chat.chatId,chat.user);
   }catch(err){
    console.log(err);
   }
   

  }


  const filteredChats = React.useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    return chats.filter(chat => 
      chat.user && chat.user.username && 
      chat.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="/search.png" alt="" />
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <img src={addMode?"/minus.png":"/plus.png"} alt="" className="add" onClick={()=>setAddMode((prev)=>!prev)}/>
      </div>
      {filteredChats?.map((chat)=>(
        <div className="item" key={chat.chatId} onClick={()=>handleSelect(chat)} style={{backgroundColor:chat?.isSeen?"transparent":"#5183fe"}}>
                    <img src={chat.user.avatar || "./avatar.png"} alt="" />
        <div className="text">
          <span>{chat.user.username}</span>
          <p>{chat.lastMessage ? (chat.lastMessage.length > 25 ? chat.lastMessage.substring(0, 25) + '...' : chat.lastMessage) : ''}</p>
          </div>
      </div>
      ))}
    
     
      {addMode && <AddUser/>}
    </div>
  );
};

export default ChatList;
