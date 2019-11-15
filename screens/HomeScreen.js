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
  Text
} from "native-base";
import { db } from "../firebase/index";
import { AuthSession } from "expo";
// AuthSession.startAsync();
// console.log(AuthSession.getRedirectUrl());
import { spotifyCredentials } from "../secrets";
import { encode as btoa } from "base-64";
import { setUser } from "../redux/userReducer";
import SpotifyWebAPI from "spotify-web-api-js";

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

  const getUserPlaylists = async () => {
    const sp = await getValidSPObj();
    const { id: userId } = await sp.getMe();
    const { items: playlists } = await sp.getUserPlaylists(userId, {
      limit: 50
    });
    return playlists;
  };

  console.log("USER OBJECT ON STATE:", user);
  console.log("PLAYLIST OBJECT ON STATE:", playlist);

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
        <Button style={{ margin: 5 }} onPress={getTokens}>
          <Text>
            {user.access_token
              ? `You are logged in through Spotify`
              : "Log In with Spotify"}
          </Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>
            {room.code ? `you are connected to ${room.code}` : `Join a Room`}
          </Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>Host a Room</Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>Edit your Sharelist</Text>
        </Button>
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
              {room.code
                ? `you are connected to ${room.code}`
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
