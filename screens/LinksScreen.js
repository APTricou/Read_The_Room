import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Header, Button, Item, Input, Text, List, ListItem } from "native-base";
import SpotifyWebAPI from "spotify-web-api-js";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { db } from "../firebase/index";
import { setRoom } from "../redux/roomReducer";
let populateCount = 0;

export default function LinksScreen() {
  const user = useSelector(state => state.user);
  const room = useSelector(state => state.room);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const dispatch = useDispatch();
  const roomReference = db.collection("rooms").doc(room.name || "test-room");
  const [roomData, roomLoading, roomDataError] = useDocumentData(roomReference);
  // guest, not host, adds new songs to firebase songs list
  // also adds songs to playlist since they have the URI

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
  const populateByFavorites = async () => {
    const sp = await getValidSPObj();
    const offsetTotal = 5 * populateCount++;
    const { items: fiveFavorites } = await sp.getMyTopTracks({
      limit: 5,
      offset: offsetTotal
    });
    const trackIDs = fiveFavorites.map(song => song.uri);
    const reducedSongs = fiveFavorites.map(song => ({
      artists: song.artists.map(artist => ({
        name: artist.name,
        id: artist.id
      })),
      trackId: song.id,
      songName: song.name
    }));
    // add to firestore
    const allSongs = roomData.songs.concat(reducedSongs);
    await roomReference.update({ songs: allSongs });
    // add to playlist
    await sp.addTracksToPlaylist(roomData.playlistID, trackIDs);
  };

  const Search = async query => {
    const sp = await getValidSPObj();
    const {
      tracks: { items }
    } = await sp.searchTracks(query, { limit: 5 });
    const reducedResults = items.map(song => ({
      artists: song.artists.map(artist => ({
        name: artist.name,
        id: artist.id
      })),
      trackId: song.id,
      songName: song.name
    }));
    setSearchResults(reducedResults);
  };

  const songInPlaylist = spotifySongId => {
    return roomData.songs.map(song => song.trackId).includes(spotifySongId);
  };

  const addSong = async spotifySongId => {
    const sp = await getValidSPObj();
    await sp.addTracksToPlaylist(roomData.playlistID, [
      "spotify:track:" + spotifySongId
    ]);
    const songObj = searchResults.find(song => song.trackId === spotifySongId);
    const newSongsList = roomData.songs.concat([songObj]);
    await roomReference.update({ songs: newSongsList });
  };

  return roomData && roomData.name ? (
    <ScrollView>
      <Item last>
        <Input
          value={searchInput}
          placeholder='Search ...'
          style={{ width: 75 }}
          onChangeText={text => setSearchInput(text)}
        />
      </Item>
      <Button
        onPress={() => {
          Search(searchInput);
        }}
        style={{ margin: 15 }}
      >
        <Text>Search</Text>
      </Button>
      {searchResults.length ? (
        <List>
          <ListItem key='Search Results' itemHeader first>
            <Text>SEARCH RESULTS</Text>
          </ListItem>
          {searchResults.map((song, index) => (
            <ListItem
              key={index}
              style={
                songInPlaylist(song.trackId) ? { backgroundColor: "green" } : {}
              }
              onPress={() => addSong(song.trackId)}
            >
              <Text>
                {song.songName} -{" "}
                {song.artists.reduce((string, artist) => {
                  return string + artist.name;
                }, "")}
              </Text>
            </ListItem>
          ))}
        </List>
      ) : null}
      <Button onPress={populateByFavorites} style={{ margin: 15 }}>
        <Text>Populate with 5 of your Favorites</Text>
      </Button>
      {roomData && roomData.songs ? (
        <List>
          <ListItem key='Songs in Playlist' itemHeader first>
            <Text>ALL SONGS</Text>
          </ListItem>
          {roomData.songs.map((song, index) => (
            <ListItem key={index}>
              <Text>
                {song.songName} -{" "}
                {song.artists.reduce((string, artist) => {
                  return string + artist.name;
                }, "")}
              </Text>
            </ListItem>
          ))}
        </List>
      ) : null}
    </ScrollView>
  ) : (
    <ScrollView>
      <Text>You are currently not in a room</Text>
    </ScrollView>
  );
}

LinksScreen.navigationOptions = {
  title: "Room"
};
