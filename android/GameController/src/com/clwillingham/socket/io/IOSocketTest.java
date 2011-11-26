package com.clwillingham.socket.io;

import java.io.IOException;

import org.json.JSONArray;

public class IOSocketTest {
	
	public static void main(String[] args) throws IOException, InterruptedException{
		IOSocket socket = new IOSocket("ws://localhost:8080", new MessageCallback() {
			
			@Override
			public void onOpen() {
			}
			
			@Override
			public void onMessage(String message) {
				System.out.println("message recieved from server: "+message);
			}

			@Override
			public void on(String event, JSONArray jsonArray) {
				
			}
		});
		socket.connect();
		System.out.println("connected to server");
		Thread.sleep(5000);
		socket.getWebSocket().sendMessage("this is a test");
		System.out.println("sen't message");
		
	}

}
