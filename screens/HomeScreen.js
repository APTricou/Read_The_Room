import * as WebBrowser from "expo-web-browser";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Container,
  Header,
  Title,
  Content,
  Footer,
  FooterTab,
  Button,
  Left,
  Right,
  Body,
  Icon,
  Text,
  Input,
  Item,
  Form
} from "native-base";
import { db } from "../firebase/index";
import { AuthSession } from "expo";
import { spotifyCredentials } from "../secrets";
import { encode as btoa } from "base-64";
import { setUser } from "../redux/userReducer";
import SpotifyWebAPI from "spotify-web-api-js";
import { setRoom, clearRoom } from "../redux/roomReducer";
import { Alert } from "react-native";

export default function HomeScreen({ navigation }) {
  const playlist = useSelector(state => state.playlist);
  const dispatch = useDispatch();
  const connected = true;
  const user = useSelector(state => state.user);
  const room = useSelector(state => state.room);
  const scopesArr = [
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-library-modify",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-recently-played",
    "user-top-read"
  ];
  const scopes = scopesArr.join(" ");

  // Login through spotify
  const getAuthorizationCode = async () => {
    try {
      let redirectUrl = AuthSession.getRedirectUrl();
      let result = await AuthSession.startAsync({
        authUrl:
          "https://accounts.spotify.com/authorize" +
          "?response_type=code" +
          "&client_id=" +
          spotifyCredentials.clientId +
          (scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
          "&redirect_uri=" +
          encodeURIComponent(redirectUrl)
      });
      return result.params.code;
    } catch (err) {
      console.error(err);
    }
  };

  // gets tokens to access spotify API and puts on user state
  const getTokens = async () => {
    try {
      const authorizationCode = await getAuthorizationCode(); //we wrote this function above
      const credentials = spotifyCredentials; //we wrote this function above (could also run this outside of the functions and store the credentials in local scope)
      const credsB64 = btoa(
        `${credentials.clientId}:${credentials.clientSecret}`
      );
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credsB64}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=${credentials.redirectUri}`
      });
      const responseJson = await response.json();
      // destructure the response and rename the properties to be in camelCase to satisfy my linter ;)
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn
      } = responseJson;
      const expirationTime = new Date().getTime() + expiresIn * 1000;
      const userData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expiration_time: expirationTime
      };
      dispatch(setUser(userData));
    } catch (err) {
      console.error(err);
    }
  };

  // refreshes tokens, references getTokens, how to call after 50 minutes?
  // setTimeout( run refresh Tokens, 50 mins?) in this function if user.tokens?
  const refreshTokens = async () => {
    try {
      const credentials = spotifyCredentials; //we wrote this function above
      const credsB64 = btoa(
        `${credentials.clientId}:${credentials.clientSecret}`
      );
      const refreshToken = user.refresh_token;
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credsB64}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`
      });
      const responseJson = await response.json();
      if (responseJson.error) {
        await getTokens();
      } else {
        const {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_in: expiresIn
        } = responseJson;
      }
      const expirationTime = new Date().getTime() + expiresIn * 1000;
      const userData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expiration_time: expirationTime
      };
      dispatch(setUser(userData));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (new Date().getTime() > user.expiration_time) {
      refreshTokens();
    }
  }, []);

  // Easy access api formatter
  const getValidSPObj = async () => {
    if (user.access_token) {
      if (new Date().getTime() > user.expiration_time) {
        // access token has expired, so we need to use the refresh token
        await refreshTokens();
      }
      var sp = new SpotifyWebAPI();
      await sp.setAccessToken(user.access_token);
      return sp;
    } else {
      console.log("must log in to make Spotify Requests");
    }
  };

  const getUserReadTheRoomPlaylist = async roomName => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    const { items: playlists } = await sp.getUserPlaylists(userId);
    const readTheRoomPlaylist = playlists.find(
      playlist => playlist.name === roomName
    );
    return readTheRoomPlaylist;
  };

  const createRoom = async (roomName, num = 0) => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    // get readtheRoom playlist from current spotify user
    let readTheRoomPlaylist = await getUserReadTheRoomPlaylist(roomName);
    // if playlist doesnt exist for user, make it
    if (!readTheRoomPlaylist) {
      readTheRoomPlaylist = await sp.createPlaylist(userId, {
        name: roomName,
        public: false,
        collaborative: true,
        description: "Read the Room Collaborative Generated playlist"
      });
    }
    // If playlist isnt collaborative, make it so
    if (!readTheRoomPlaylist.collaborative) {
      await sp.changePlaylistDetails(readTheRoomPlaylist.id, {
        public: false,
        collaborative: true
      });
    }
    // add playlist and song data for read The Room playlist to firebase, selectively
    const { items: songs } = await sp.getPlaylistTracks(readTheRoomPlaylist.id);
    const reducedSongs = songs.map(song => ({
      artists: song.track.artists.map(artist => ({
        name: artist.name,
        id: artist.id
      })),
      trackId: song.track.id,
      songName: song.track.name
    }));

    // create instance of room on firebase
    const hostRoom = await db
      .collection("rooms")
      .doc(roomName)
      .get();
    if (!hostRoom.exists) {
      await db
        .collection("rooms")
        .doc(roomName)
        .set({
          name: roomName,
          host: userId,
          playlistID: readTheRoomPlaylist.id,
          users: [userId],
          songs: reducedSongs
        });
      dispatch(
        setRoom({
          name: roomName,
          host: userId,
          playlistID: readTheRoomPlaylist.id,
          users: [userId],
          songs: reducedSongs
        })
      );
    } else {
      const hostRoomData = hostRoom.data();
      if (hostRoomData.host === userId) {
        dispatch(setRoom(hostRoomData));
      } else {
        Alert.alert(
          "Room Conflict",
          "That Room already exists, creating a new name",
          [{ text: "OK", onPress: () => console.log("OK Pressed") }]
        );
        num++;
        createRoom(roomName + String(num), num);
      }
    }
  };

  const joinRoom = async roomName => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    // find room on firebase
    const hostRoomRef = db.collection("rooms").doc(roomName);
    const hostRoom = await hostRoomRef.get();
    if (!hostRoom.exists) {
      Alert.alert("Error", "Room Does not exist");
    } else {
      const users = hostRoom.data().users;
      if (!users.includes(userId)) {
        users.push(userId);
        await hostRoomRef.update({ users: users });
      }
      dispatch(setRoom({ ...hostRoom.data(), users: users }));
    }
  };
  const leaveRoom = async roomName => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    const hostRoomRef = db.collection("rooms").doc(roomName);
    const hostRoom = await hostRoomRef.get();
    const usersWithoutYou = hostRoom
      .data()
      .users.filter(user => user !== userId);
    hostRoomRef.update({ users: usersWithoutYou });
    dispatch(clearRoom());
  };

  // firebase hook to update room reducer goes here

  const [input, setInput] = useState("");

  return (
    <Container>
      <Header>
        <Body>
          <Title>Read The Room</Title>
        </Body>
      </Header>
      <Content>
        {user.access_token ? (
          <Container
            style={{
              justifyContent: "center"
            }}
          >
            {room.name ? (
              //if in a room diplay header stating current Room
              <Content>
                <Item>
                  <Text>You are connected to {room.name}</Text>
                </Item>
                <Item>
                  <Text>There are {room.users.length} users in this room</Text>
                </Item>
                {room.users.map((user, index) => (
                  <Item key={index}>
                    <Text>{user}</Text>
                  </Item>
                ))}
                <Button
                  style={{ margin: 5 }}
                  onPress={() => {
                    if (!room.name) {
                      joinRoom(input);
                    } else {
                      leaveRoom(room.name);
                    }
                    navigation.navigate("Room");
                  }}
                >
                  <Text>
                    {room.name ? `Leave ${room.name}` : `Join a Room`}
                  </Text>
                </Button>
              </Content>
            ) : (
              // if not in a room, display input and button
              <Container style={{ justifyContent: "center" }}>
                <Item rounded>
                  <Input
                    value={`${input}`}
                    placeholder='Enter a room name'
                    style={{ width: 75 }}
                    onChangeText={text => setInput(text)}
                  />
                </Item>
                <Button
                  style={{ margin: 5 }}
                  onPress={() => {
                    if (!room.name) {
                      joinRoom(input);
                    } else {
                      leaveRoom(room.name);
                    }
                    navigation.navigate("Room");
                  }}
                >
                  <Text>
                    {room.name ? `Leave ${room.name}` : `Join a Room`}
                  </Text>
                </Button>
                <Button
                  style={{ margin: 5 }}
                  onPress={() => {
                    if (!room.name) {
                      createRoom(input);
                    } else {
                      leaveRoom(room.name);
                    }
                    navigation.navigate("Room");
                  }}
                >
                  <Text>{room.name ? `Stop Hosting` : "Host a Room"}</Text>
                </Button>
              </Container>
            )}
          </Container>
        ) : (
          <Button style={{ margin: 30 }} onPress={getTokens}>
            <Text>Log In with Spotify</Text>
          </Button>
        )}
      </Content>
      <Footer>
        <FooterTab>
          <Button full>
            <Text>
              You are{" "}
              {user.access_token
                ? `logged in through spotify`
                : "not logged in"}
            </Text>
            <Text>
              You are{" "}
              {room.name
                ? `connected to "${room.name}"`
                : `currently not in a room`}
            </Text>
          </Button>
        </FooterTab>
      </Footer>
    </Container>
  );
}

HomeScreen.navigationOptions = {
  header: null
};
