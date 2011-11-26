package com.clwillingham.socket.io;

import java.io.IOException;
import java.net.URI;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import net.tootallnate.websocket.WebSocketClient;

public class IOWebSocket extends WebSocketClient{
	
	@SuppressWarnings("unused")
	private boolean connected;
	@SuppressWarnings("unused")
	private IOBeat heartBeater;
	private MessageCallback callback;
	private static int currentID = 0;

	public IOWebSocket(URI arg0, MessageCallback callback) {
		super(arg0);
		this.callback = callback;
	}

	@Override
	public void onClose() {
	}

	@Override
	public void onIOError(IOException arg0) {
	}

	@Override
	public void onMessage(String arg0) {
		IOMessage message = IOMessage.parseMsg(arg0);
		if(message.getType() == IOMessage.HEARTBEAT){
			try {
				send("2::");
				System.out.println("HeartBeat written to server");
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		} else if (message.getType() == IOMessage.MESSAGE){
			callback.onMessage(message.getMessageData());
		} else if (message.getType() == IOMessage.EVENT) {
			JSONObject obj;
			try {
				obj = new JSONObject(message.getMessageData());
				JSONArray args = null;
				if (obj.has("args"))
					args = obj.getJSONArray("args");
				callback.on((String)obj.get("name"), args);
			} catch (JSONException e) {
			}
		}
		
	}

	@Override
	public void onOpen() {
		callback.onOpen();
	}
	
	public void init(String path, String query) throws IOException{
		this.send("1::"+path+"?"+query);
		
	}
	public void SendMessage(IOMessage message) throws IOException{
		send(message.toString());
	}
	
	public void sendMessage(String message) throws IOException{
		send(new Message(message).toString());
	}
	
	public static int genID(){
		currentID++;
		return currentID;
		
	}

}
