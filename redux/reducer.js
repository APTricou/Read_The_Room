import { combineReducers } from "redux";
import { userReducer } from "./userReducer";
import { playlistReducer } from "./playlistReducer";
import { roomReducer } from "./roomReducer";

const reducer = combineReducers({
  playlist: playlistReducer,
  user: userReducer,
  room: roomReducer
});

export default reducer;
