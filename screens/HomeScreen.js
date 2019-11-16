import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
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
  List,
  ListItem
} from "native-base";
import { db } from "../firebase/index";
import { AuthSession } from "expo";
// AuthSession.startAsync();
// console.log(AuthSession.getRedirectUrl());
import { spotifyCredentials } from "../secrets";
import { encode as btoa } from "base-64";
import { setUser } from "../redux/userReducer";
import SpotifyWebAPI from "spotify-web-api-js";
import { setRoom } from "../redux/roomReducer";

export default function HomeScreen() {
  // const testPlaylistRef = db.collection("playlists").doc("test-playlist");
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

  const getUserReadTheRoomPlaylist = async () => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    const { items: playlists } = await sp.getUserPlaylists(userId);
    console.log("userId", userId);
    const readTheRoomPlaylist = playlists.find(
      playlist => playlist.name === "ReadTheRoom"
    );
    console.log("ReadTheRoom URI : ", readTheRoomPlaylist.uri);
    return readTheRoomPlaylist;
  };

  // maybe an input later
  const roomName = "Antanas Party";

  const createRoom = async roomName => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    // create instance of room on firebase
    const hostRoomRef = await db
      .collection("rooms")
      .add({ name: roomName, users: [userId] });

    // get readtheRoom playlist from current spotify user
    let readTheRoomPlaylist = await getUserReadTheRoomPlaylist();
    // if playlist doesnt exist for user, make it
    if (!readTheRoomPlaylist) {
      readTheRoomPlaylist = await sp.createPlaylist(userId, {
        name: "ReadTheRoom",
        private: true,
        collaborative: true
      });
    }
    // If playlist isnt collaborative, make it so
    if (!readTheRoomPlaylist.collaborative) {
      await sp.changePlaylistDetails(readTheRoomPlaylist.id, {
        private: true,
        collaborative: true
      });
    }
    // add playlist and song data for read The Room playlist to firebase, selectively
    const songs = await sp.getPlaylistTracks(readTheRoomPlaylist.id);
    const reducedSongs = songs.items.map(song => ({
      artists: song.track.artists.map(artist => ({
        name: artist.name,
        id: artist.id
      })),
      trackId: song.track.id,
      songName: song.track.name
    }));
    console.log("number of songs on ReadTheRoom playlist", reducedSongs.length);

    await hostRoomRef.update({ songs: reducedSongs });
    const response = await hostRoomRef.get();
    dispatch(setRoom(response.data()));
  };

  // console.log("USER OBJECT ON STATE:", user);
  // console.log("PLAYLIST OBJECT ON STATE:", playlist);
  console.log("hostRoom", room);

  return (
    <Container>
      <Header>
        <Left>
          <Button transparent>
            <Icon name='menu' />
          </Button>
        </Left>
        <Body>
          <Title>Read The Room</Title>
        </Body>
        <Right />
      </Header>
      <Content>
        {user.access_token ? null : (
          <Button style={{ margin: 5 }} onPress={getTokens}>
            <Text>Log In with Spotify</Text>
          </Button>
        )}
        <Button style={{ margin: 5 }} onPress={getUserReadTheRoomPlaylist}>
          <Text>
            {room.name ? `you are connected to ${room.name}` : `Join a Room`}
          </Text>
        </Button>
        <Button style={{ margin: 5 }} onPress={() => createRoom(roomName)}>
          <Text>{room.name ? `Stop Hosting` : "Host a Room"}</Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>Edit your Sharelist</Text>
        </Button>
        {room.songs ? (
          <List>
            <ListItem key='Songs in Playlist' itemHeader first>
              <Text>ALL SONGS</Text>
            </ListItem>
            {room.songs
              ? room.songs.map((song, index) => (
                  <ListItem key={index}>
                    <Text>
                      {song.songName} -{" "}
                      {song.artists.reduce((string, artist) => {
                        return string + artist.name;
                      }, "")}
                    </Text>
                  </ListItem>
                ))
              : null}
          </List>
        ) : null}
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
