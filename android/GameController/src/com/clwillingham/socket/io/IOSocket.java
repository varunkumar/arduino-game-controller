package com.clwillingham.socket.io;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.util.Scanner;

public class IOSocket {
	
	private IOWebSocket webSocket;
	private URL connection;
	private String sessionID;
	private int heartTimeOut;
	private int closingTimeout;
	private String[] protocals;
	private String webSocketAddress;
	private MessageCallback callback;
	
	public IOSocket(String address, MessageCallback callback){
		webSocketAddress = address;
		this.callback = callback;
	}
	
	
	public void connect() throws IOException{
		String url = webSocketAddress.replace("ws://", "http://");
		URL connection = new URL(url+"/socket.io/1/"); //handshake url
		InputStream stream = connection.openStream();
		Scanner in = new Scanner(stream);
		String response = in.nextLine(); //pull the response
		System.out.println(response);
		if(response.contains(":")){
			String[] data = response.split(":");
			setSessionID(data[0]);
			setHeartTimeOut(Integer.parseInt(data[1]));
			setClosingTimeout(Integer.parseInt(data[2]));
			setProtocals(data[3].split(","));
		}
		webSocket = new IOWebSocket(URI.create(webSocketAddress+"/socket.io/1/websocket/"+sessionID), callback);
		System.out.println("connecting to " + webSocket.getURI().toString());
		webSocket.connect();
		System.out.println("connected");
		//webSocket.init();
		
	}


	public void setWebSocket(IOWebSocket webSocket) {
		this.webSocket = webSocket;
	}


	public IOWebSocket getWebSocket() {
		return webSocket;
	}


	public void setConnection(URL connection) {
		this.connection = connection;
	}


	public URL getConnection() {
		return connection;
	}


	public void setHeartTimeOut(int heartTimeOut) {
		this.heartTimeOut = heartTimeOut;
	}


	public int getHeartTimeOut() {
		return heartTimeOut;
	}


	public void setClosingTimeout(int closingTimeout) {
		this.closingTimeout = closingTimeout;
	}


	public int getClosingTimeout() {
		return closingTimeout;
	}


	public void setSessionID(String sessionID) {
		this.sessionID = sessionID;
	}


	public String getSessionID() {
		return sessionID;
	}


	public void setProtocals(String[] protocals) {
		this.protocals = protocals;
	}


	public String[] getProtocals() {
		return protocals;
	}

}
