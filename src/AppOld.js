import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React, { useEffect, useState } from 'react';

import Amplify, { Auth } from 'aws-amplify';
import { AmplifyAuthenticator, AmplifySignOut } from 'aws-amplify';

import { Signer } from '@aws-amplify/core';
import Location from "aws-sdk/clients/location";

import Pin from './Pin'
import useInterval from './useInterval'

import ReactMapGL, {Marker,
  NavigationControl
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import awsconfig from './aws-exports';

const mapName = "donde-esta-miguel-map";
const indexName = "DondeEstaMiguelIndex";
const trackerName = "MiguelsTracker";
const deviceID = "tracker1";

Amplify.configure(awsconfig);

const transformRequest = (credentials) => (url, resourceType) => {
  if (resourceType === "Style" && !url?.includes("://")) {
    url = `https://maps.geo.${awsconfig.aws_project_region}.amazonaws.com/maps/v0/maps/${url}/style-descriptor`;
  }


  // Only sign AWS requests
  if (url?.includes("amazonaws.com")) {
    return {
      url: Signer.signUrl(url, {
        access_key: credentials.accessKeyId,
        secret_key: credentials.secretAccessKey,
        session_token: credentials.sessionToken,
      })
    };
  }

  return { url: url || "" };
}

function Header(props) {
  return (
    <div className="container">
      <div className="row">
        <div className="col-10">
          <h1>FooBar Maps</h1>
        </div>
        <div className="col-2">
          <AmplifySignOut />
        </div>
      </div>
    </div>
  )
};

function Search(props) {

  const [place, setPlace] = useState('Cagliari');

  const handleChange = (event) => {
    setPlace(event.target.value);
  }

  const handleClick = (event) => {
    event.preventDefault();
    props.searchPlace(place);
  }

  return (
    <div className="container">
      <div className="input-group">
        <input type="text" className="form-control-lg" placeholder="Search for Places" aria-label="Place" aria-describedby="basic-addon2" value={ place } onChange={handleChange} />
        <div className="input-group-append">
          <button className="btn btn-primary" type="submit" onClick={ handleClick }>Go Find that!</button>
        </div>
      </div>
    </div>
  )

};

function Track(props){
  const handleClick = (event) => {
    event.preventDefault();
    props.trackDevice();
  }

  return (
    <div className="container">
      <div className="input-group">
        <div className="input-group-append">
          <button className="btn btn-primary" type="submit" onClick={ handleClick }>Track</button>
        </div>
      </div>
    </div>
  )
}
