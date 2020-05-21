import React, {Component} from 'react'
import {Link, Redirect} from 'react-router-dom'
import {connect} from 'react-redux'
import {fetchUsers} from '../../store/allUsers'
import {usersInRoom, roomDeleteUser, roomAddUser} from '../../store/allRoom'
import {fetchWord} from '../../store/word'
import {me} from '../../store/user'
import io from 'socket.io-client'
import Chatroom from '../chatroom'
import Axios from 'axios'
const socket = io.connect(window.location.origin)

import {AllPlayers} from './AllPlayers'

export class Lobby extends Component {
  constructor(props) {
    super(props)
    this.state = {
      room: this.props.location.state.lobby,
      gameWord: '------',
      starting: false,
      currentArtist: {},
    }
    this.handleClick = this.handleClick.bind(this)
    this.wordGenerator = this.wordGenerator.bind(this)
    this.handlePass = this.handlePass.bind(this)
    this.startGame = this.startGame.bind(this)
  }

  componentDidMount() {
    this.props.usersInRoom(this.state.room.id)

    // JOIN SOCKET LOBBY
    socket.emit('join_lobby', this.state.room.name, this.props.user)

    // LISTEN FOR ARTIST WORD GENERATION
    socket.on('send_word', (newWord) => {
      this.setState({gameWord: newWord})
    })

    // LISTEN FOR LATE LOBBY JOINING
    if (this.props.user.isArtist) {
      this.setState({currentArtist: this.props.user})
      socket.on('join_lobby_late', (user) => {
        socket.emit('word_generate', this.state.gameWord, this.state.room.name)
        socket.emit('new_artist', this.state.room.name, this.props.user)
        this.props.usersInRoom(this.state.room.id)
      })
    } else {
      socket.on('join_lobby_late', (user) => {
        this.props.usersInRoom(this.state.room.id)
      })
    }

    // LISTEN FOR GAME START
    socket.on('start_game', (room) => {
      this.setState({starting: true})
    })

    // LISTEN FOR UPDATED ARTIST
    socket.on('artist_incoming', (artist) => {
      this.setState({currentArtist: artist})
      console.log(
        'THIS>STATE>CURRENTARTIST ------>>>>>>',
        this.state.currentArtist
      )
    })
    //LISTEN FOR BRUSH PASS
    // socket.on('passed_brush',() )

    if (this.props.user.isArtist) {
      this.wordGenerator()
    }
  }

  handleClick() {
    const room = this.props.match.params.roomId
    const user = this.props.user.id
    this.props.roomDeleteUser(room, user)

    // LEAVE SOCKET LOBBY
    socket.emit('leave_lobby', this.state.room.name, this.props.user)
  }

  wordGenerator() {
    let newWord = this.props.word[
      Math.floor(Math.random() * (this.props.word.length - 1)) + 1
    ].content
    this.setState({
      gameWord: newWord,
    })
    socket.emit('word_generate', newWord, this.state.room.name)
  }

  async handlePass() {
    function getRandomIntInclusive(min, max) {
      min = Math.ceil(min)
      max = Math.floor(max)
      return Math.floor(Math.random() * (max - min + 1)) + min
    }
    let randomNum = getRandomIntInclusive(0, this.props.inRoom.length - 1)
    // Math.floor(Math.random() * (this.props.inRoom.length - 1)) +1
    if (this.props.inRoom.length > 1) {
      while (this.props.inRoom[randomNum].id === this.state.currentArtist.id) {
        console.log('INSIDE WHILE LOOP ------->>>>>>>')
        console.log('RANDOM NUMBER BEFORE --------->>>>>>>>', randomNum)
        randomNum = getRandomIntInclusive(0, this.props.inRoom.length - 1)
        console.log('RANDOM NUMBER AFTER --------->>>>>>>>', randomNum)
      }
    } else {
      randomNum = 0
    }
    const nextArtist = this.props.inRoom[randomNum]
    const nextArtistId = nextArtist.id
    const currentArtist = this.props.user
    const currentArtistId = currentArtist.id
    await Axios.put(`/api/users/setAsArtist/${currentArtistId}/false`)
    await Axios.put(`/api/users/setAsArtist/${nextArtistId}/true`)
    await socket.emit('new_artist', this.state.room.name, nextArtist)
    this.props.usersInRoom(this.state.room.id)
  }

  startGame() {
    socket.emit('start_game', this.state.room.name)
  }

  render() {
    return (
      <div>
        {this.state.starting ? (
          <Redirect
            to={{
              pathname: '/game',
              room: this.state.room,
              word: this.state.gameWord,
              socket,
            }}
          />
        ) : (
          ''
        )}
        <h1>Welcome to {this.state.room.name}!</h1>
        {this.props.user.name === this.state.currentArtist.name ? (
          <div>
            <h1>
              Get ready {this.props.user.name}, YOU are the artist this round!
            </h1>
            <br />
            <h1>Your word is: {this.state.gameWord} </h1>
            <button type="button" onClick={this.handlePass}>
              Pass The Paintbrush
            </button>
            <button type="button" onClick={this.wordGenerator}>
              Regenerate Word
            </button>
            <button type="button" onClick={this.startGame}>
              Start Game!
            </button>
          </div>
        ) : (
          <h1>...Waiting for Artist to start the game</h1>
        )}
        <Chatroom
          room={this.state.room}
          user={this.props.user}
          inRoom={this.props.inRoom}
          socket={socket}
          leaveLobby={this.handleClick}
          currentArtist={this.state.currentArtist}
        />
      </div>
    )
  }
}

const mapState = (state) => ({
  // allUsers: state.allUsers,
  inRoom: state.allRoom.inRoom,
  // inRoom: state.allRoom.inRoom,
  word: state.word,
  rooms: state.allRoom,
  user: state.user,
})

const mapDispatch = (dispatch) => ({
  fetchUsers: () => {
    dispatch(fetchUsers())
  },
  fetchWord: () => {
    dispatch(fetchWord())
  },
  roomDeleteUser: (roomId, userId) => {
    dispatch(roomDeleteUser(roomId, userId))
  },
  usersInRoom: (roomId) => {
    dispatch(usersInRoom(roomId))
  },
  roomAddUser: (roomId, userId) => {
    dispatch(roomAddUser(roomId, userId))
  },
  getUser: () => dispatch(me()),
})

export default connect(mapState, mapDispatch)(Lobby)
