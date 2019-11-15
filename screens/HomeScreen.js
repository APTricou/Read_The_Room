import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { Image } from "react-native";
import { useSelector } from "react-redux";
import { MonoText } from "../components/StyledText";
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
import { SafeAreaView } from "react-navigation";
import { db } from "../firebase/index";
getPlaylist = async playlistRef => playlistRef.get().data();
// const data = await getPlaylist(testPlaylistRef);
// console.log(data)

export default function HomeScreen() {
  // const testPlaylistRef = db.collection("playlists").doc("test-playlist");
  // const playlist = useSelector(state => state.playlist);

  const connected = true;
  const roomCode = "xTgFw3";
  const loggedIn = true;
  const user = { name: "Antanas" };
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
        <Button style={{ margin: 5 }}>
          <Text>Log In</Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>Join a Room</Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>Host a Room</Text>
        </Button>
        <Button style={{ margin: 5 }}>
          <Text>Set Your Preferences</Text>
        </Button>
      </Content>
      <Footer>
        <FooterTab>
          <Button full>
            <Text>
              You are {loggedIn ? `logged in as ${user.name}` : "not logged in"}
            </Text>
            <Text>
              You are{" "}
              {connected ? `connected to room ${roomCode}` : "not connected"}
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
