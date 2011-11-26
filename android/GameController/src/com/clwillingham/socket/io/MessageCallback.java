package com.clwillingham.socket.io;

import org.json.JSONArray;

public interface MessageCallback {
	public void on(String event, JSONArray jsonArray);
	public void onMessage(String message);
	public void onOpen();
	
	
}
