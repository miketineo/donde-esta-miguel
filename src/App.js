import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import { AmplifyAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import Amplify, { Auth, Hub } from 'aws-amplify';
import { Signer } from "@aws-amplify/core";
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
const deviceID = "myphone1";

Amplify.configure(awsconfig);

/**
 * Sign requests made by Mapbox GL using AWS SigV4.
 */
 const transformRequest = (credentials) => (url, resourceType) => {
  // Resolve to an AWS URL
  if (resourceType === "Style" && !url?.includes("://")) {
    url = `https://maps.geo.${awsconfig.aws_project_region}.amazonaws.com/maps/v0/maps/${url}/style-descriptor`;
  }

  // Only sign AWS requests (with the signature as part of the query string)
  if (url?.includes("amazonaws.com")) {
    return {
      url: Signer.signUrl(url, {
        access_key: credentials.accessKeyId,
        secret_key: credentials.secretAccessKey,
        session_token: credentials.sessionToken,
      })
    };
  }

  // Don't sign
  return { url: url || "" };
};

function Track(props){
  
  const handleClick = (event) => {
    let mapDiv = document.getElementById('map-box-container');
    event.preventDefault();
    mapDiv.scrollIntoView({ 
      behavior: "auto", block: "end", inline: "nearest"
    });
    props.trackDevice()
  }

  return (
    <div className="position-relative vertical-center" style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <button type="button" onClick={ handleClick } className="btn btn-dark position-relative">
  Donde Esta Miguel? <svg width="1em" height="1em" viewBox="0 0 16 16" className="position-absolute top-100 start-50 translate-middle mt-1 bi bi-caret-down-fill" fill="#212529" xmlns="http://www.w3.org/2000/svg"><path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
</button>
  </div>
  )
}

function MiguelIs(props){
  return (
    // <div style={{
    //   width:"100vh",
    //   height:"100vh",
    //   backgroundColor: '#38b6ff',
    //   background: `#38b6ff url("/Donde.png") no-repeat fixed center`
    // }}>
      <h1 style={{
        top: 200,
        color: 'white',
        backgroundColor: 'black',
      }}>Miguel Is in {props.place}</h1>
    //</div>
  )
}

const App = () => {

  const [credentials, setCredentials] = useState(null);

  const [viewport, setViewport] = useState({
    longitude: -123.1187,
    latitude: 49.2819,
    zoom: 10,
  });

  const [client, setClient] = useState(null);
  const [currentPlace, setCurrentPlace] = useState(null);
 
  const [marker, setMarker] = useState({
    longitude: -123.1187,
    latitude: 49.2819,
  });

  const [devPosMarkers, setDevPosMarkers] = useState([]); 

  useEffect(() => {
    const fetchCredentials = async () => {
      setCredentials(await Auth.currentUserCredentials());
    };

    fetchCredentials();

    const createClient = async () => {
      const credentials = await Auth.currentCredentials();
      const client = new Location({
          credentials,
          region: awsconfig.aws_project_region,
     });
     setClient(client);
    }

    createClient();  
  }, []);

  useInterval(() => {
    getDevicePosition();
  }, 30000);

  const getDevicePosition = () => {
    setDevPosMarkers([]);

    var params = {
      DeviceId: deviceID,
      TrackerName: trackerName,
      StartTimeInclusive: "2020-11-02T19:05:07.327Z",
      EndTimeExclusive: new Date()
    };

    client.getDevicePositionHistory(params, (err, data) => {
      if (err) console.error(err, err.stack); 
      if (data) { 
        //console.log(data)
        const tempPosMarkers = data.DevicePositions.map( function (devPos, index) {
        searchPlaceByPos(devPos.Position);

          return {
            index: index,
            long: devPos.Position[0],
            lat: devPos.Position[1],
          } 
        });

        setDevPosMarkers(tempPosMarkers);

        const pos = tempPosMarkers.length -1;

        if (tempPosMarkers.length === 0) {
          console.log("No locations yet!"); 
          return {} 
        } else {
          setViewport({
            longitude: tempPosMarkers[pos].long,
            latitude: tempPosMarkers[pos].lat, 
            zoom: 5});
          }
        }

    });
  }
  

  const searchPlaceByPos = (pos) => {
    const params = {
      MaxResults: 1,
      IndexName: indexName,
      Position: pos,
    };
  
    client.searchPlaceIndexForPosition(params, (err,data) => {
      if (err) console.error(err, err.stack);
      if (data) {
        const place = data.Results[0]?.Place?.Municipality;
        setCurrentPlace(place);
      } 
    });
  }

  const trackerMarkers = React.useMemo(() => devPosMarkers.map(
    pos => (
      <Marker key={pos.index} longitude={pos.long} latitude={pos.lat} >
        <Pin text={pos.index+1} size={20}/>
      </Marker>
    )), [devPosMarkers]);

  return (
    <AmplifyAuthenticator>

      <div className="App">
        <div>
          <Track trackDevice = {getDevicePosition}/>
        </div>
        <br/>
        <div id="map-box-container">
        {credentials ? (
            <ReactMapGL
              {...viewport}
              width="100%"
              height="100vh"
              transformRequest={transformRequest(credentials)}
              mapStyle={mapName}
              onViewportChange={setViewport}
            >
              <Marker
                key={Date.now()}
                longitude={marker.longitude}
                latitude={marker.latitude}
                offsetTop={-20}
                offsetLeft={-10}
              > 
              <Pin size={20}/>
              </Marker>
              <div>
                <MiguelIs place={ currentPlace || "nowhere" }/>
                <AmplifySignOut/>
              </div>
            
              {trackerMarkers}

              <div style={{ position: "absolute", left: 20, top: 20 }}>
                <NavigationControl showCompass={false} />
              </div>
            </ReactMapGL>     
        
    
        ) : (
          <h1>Loading...</h1>
        )}
        </div>
      </div>
      </AmplifyAuthenticator>

  );
}

export default App;