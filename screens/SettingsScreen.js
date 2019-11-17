import React from "react";
import { ExpoConfigView } from "@expo/samples";
import {
  Container,
  Header,
  Text,
  Body,
  Title,
  Content,
  Item
} from "native-base";

export default function SettingsScreen() {
  return (
    <Container>
      <Header>
        <Body>
          <Title>Read The Room App Details</Title>
        </Body>
      </Header>
      <Content>
        <Item>
          <Text>Version 0.1</Text>
        </Item>

        <Item>
          <Text>
            Description - An app designed to wrap the spotify API and make it
            easier to collaboratively edit playlists as a group
          </Text>
        </Item>
        <Item>
          <Text>Github - https://github.com/APTricou/Read_The_Room</Text>
        </Item>
      </Content>
    </Container>
  );
}

SettingsScreen.navigationOptions = {
  title: "Details"
};
