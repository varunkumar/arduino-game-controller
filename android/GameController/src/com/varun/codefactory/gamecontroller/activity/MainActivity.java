package com.varun.codefactory.gamecontroller.activity;

import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

import org.json.JSONArray;
import org.json.JSONException;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.android.future.usb.UsbAccessory;
import com.android.future.usb.UsbManager;
import com.clwillingham.socket.io.IOMessage;
import com.clwillingham.socket.io.IOSocket;
import com.clwillingham.socket.io.IOWebSocket;
import com.clwillingham.socket.io.MessageCallback;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import com.markupartist.android.widget.ActionBar;
import com.markupartist.android.widget.ActionBar.Action;
import com.markupartist.android.widget.ActionBar.IntentAction;
import com.varun.codefactory.gamecontroller.R;
import com.varun.codefactory.gamecontroller.util.Prefs;

public class MainActivity extends Activity implements Runnable {
	private static final String TAG = "Arduino Game Controller";
	private static final String TAG_SOCKET = TAG + " - Socket";
	private static final String TAG_USB = TAG + " - USB";
	private static final String TAG_SCAN = TAG + " - Scan";
	
	/** 
	 * Constants used for Permissions
	 */
    private static final String ACTION_USB_PERMISSION = "com.varun.codefactory.gamecontroller.action.USB_PERMISSION";

    /**
     *  Constants used for sending messages between different components of the application
     */
	protected static final int MESSAGE_RENDER_JOYSTICK_DATA = 100;
	protected static final int MESSAGE_PUBLISH_JOYSTICK_DATA = 101;
	protected static final int MESSAGE_SOCKET_CONNECTED = 201;
	protected static final int MESSAGE_INVALID_TOKEN = 202;
	
	/**
	 *  Constants used for Socket events
	 */
	protected static final String EVENT_JOIN = "join";
	protected static final String EVENT_DECLINED = "declined";
	protected static final String EVENT_CONTROLLER_READY = "controllerReady";
	protected static final String EVENT_GAME_EVENT = "gameEvent";
	
	/**
	 *  Constants used for remembering the URL and token for the next launch
	 */
	protected static final String PREFS_URL = "PREFS_URL";
	protected static final String PREFS_TOKEN = "PREFS_TOKEN";
	
	/**
	 *  Members related to USB Accessory API
	 */
    private UsbManager mUsbManager;
	private PendingIntent mPermissionIntent;
	private boolean mPermissionRequestPending;
	private UsbAccessory mAccessory;
	private ParcelFileDescriptor mFileDescriptor;
	private FileInputStream mInputStream;
	private FileOutputStream mOutputStream;
	
	/** 
	 * Members for holding UI widgets
	 */
	private TextView lblX;
	private TextView lblY;
	
	/**
	 * Members related to the data from the accessory
	 */
	private JoystickMsg joystickMsg = new JoystickMsg(0, 0);
	
	/**
	 * Members related to Socket communication
	 */
	private String wsURL = "";
	private String token = "";
	private Boolean isSocketConnected = false;
	private IOSocket socket = null; 
	
	/**
	 * Implementation of Callback interface for Socket communication. 
	 * Extended Socket.io Java client to support Events.
	 * Ref: https://github.com/benkay/java-socket.io.client
	 */
	private MessageCallback socketCallback = new MessageCallback() {

		@Override
		public void onOpen() {
			Log.d(TAG_SOCKET, "Connection opened.");
			IOMessage msg = new IOMessage(IOMessage.EVENT, IOWebSocket.genID(), "", "{\"name\":\"" + EVENT_JOIN + "\",\"args\":[\"" + token + "\", true]}");
			try {
				socket.getWebSocket().SendMessage(msg);
			} catch (IOException e) {
				e.printStackTrace();
			}
		}

		@Override
		public void onMessage(String message) {
			Log.d(TAG_SOCKET, "Message recieved from server: " + message);
		}

		@Override
		public void on(String event, JSONArray data) {
			Log.d(TAG_SOCKET, "Event: " + event + " Data: " + data);
			if (event.equals(EVENT_DECLINED)) {
				String msg = "Connection declined: ";
				try {
					msg += data.get(0).toString();
				} catch (JSONException e) {
				}
				Message m = Message.obtain(mHandler, MESSAGE_INVALID_TOKEN);
				m.obj = msg;
				mHandler.sendMessage(m);
				isSocketConnected = false;
			} else if (event.equals(EVENT_CONTROLLER_READY)) {
				isSocketConnected = true;
				Log.d(TAG_SOCKET, "Connected to socket!");
				Message m = Message.obtain(mHandler, MESSAGE_SOCKET_CONNECTED);
				m.obj = "Connected to socket!";
				mHandler.sendMessage(m);
			}
		}
	};
	
	/**
	 * BroadcastReceiver for listening to USB events. 
	 */
	private final BroadcastReceiver mUsbReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();
			if (ACTION_USB_PERMISSION.equals(action)) {
				synchronized (this) {
					UsbAccessory accessory = UsbManager.getAccessory(intent);
					if (intent.getBooleanExtra(
							UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
						openAccessory(accessory);
					} else {
						Log.d(TAG_USB, "Permission denied for accessory "
								+ accessory);
					}
					mPermissionRequestPending = false;
				}
			} else if (UsbManager.ACTION_USB_ACCESSORY_DETACHED.equals(action)) {
				UsbAccessory accessory = UsbManager.getAccessory(intent);
				if (accessory != null && accessory.equals(mAccessory)) {
					closeAccessory();
				}
			}
		}
	};
	
	/** 
	 * Called when the activity is first created. 
	 */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initializing USB manager and registering the broadcast receiver 
        mUsbManager = UsbManager.getInstance(this);
		mPermissionIntent = PendingIntent.getBroadcast(this, 0, new Intent(
				ACTION_USB_PERMISSION), 0);
		IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
		filter.addAction(UsbManager.ACTION_USB_ACCESSORY_DETACHED);
		registerReceiver(mUsbReceiver, filter);

		if (getLastNonConfigurationInstance() != null) {
			mAccessory = (UsbAccessory) getLastNonConfigurationInstance();
			openAccessory(mAccessory);
		}

		// Loading the UI layout
        setContentView(R.layout.main);
        
        lblX = (TextView) findViewById(R.id.lblX);
		lblX.setText("X: N/A");
		
		lblY = (TextView) findViewById(R.id.lblY);
		lblY.setText("Y: N/A");
		
		// Pre-populating the text boxes with last known value
		EditText txtURL = (EditText) findViewById(R.id.txtURL);
		EditText txtToken = (EditText) findViewById(R.id.txtToken);
		
		SharedPreferences prefs = Prefs.get(this);
		txtToken.setText(prefs.getString(PREFS_TOKEN, ""));
		txtURL.setText(prefs.getString(PREFS_URL, ""));
		
		// Using the helper class to pass intent to QR code scanner activity
		// Ref: http://code.google.com/p/zxing/wiki/ScanningViaIntent
		final Button btnScan = (Button) findViewById(R.id.btnScan);
		btnScan.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
            	IntentIntegrator integrator = new IntentIntegrator((MainActivity) v.getContext());
            	integrator.initiateScan(IntentIntegrator.QR_CODE_TYPES);
            }
		});
		
		// Initiating the web socket communication
		final Button btnConnect = (Button) findViewById(R.id.btnConnect);
		btnConnect.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
            	try {
            		Log.d(TAG_SOCKET, "Connecting to socket...");
            		showToast("Connecting to socket...");
            		
            		EditText txtURL = (EditText) findViewById(R.id.txtURL);
            		EditText txtToken = (EditText) findViewById(R.id.txtToken);
            		wsURL = txtURL.getText().toString();
            		token = txtToken.getText().toString();
            		
            		// Storing the last known values
            		SharedPreferences prefs = Prefs.get(v.getContext());
            		SharedPreferences.Editor editor = prefs.edit();
            		editor.putString(PREFS_URL, wsURL);
            		editor.putString(PREFS_TOKEN, token);
            		editor.commit();
            		
            		isSocketConnected = false;
            		socket = new IOSocket(wsURL, socketCallback);
        			socket.connect();
        			// TODO: Revisit this sleep. Ideally, this should be done on the message callback. 
        			//Thread.sleep(5000);
        		} catch (IOException e) {
        			e.printStackTrace();
        		}
            }
        });
		
		// Using Android-ActionBar to show action bar from Android 2.3.3
		// Reference: https://github.com/johannilsson/android-actionbar
		final ActionBar actionBar = (ActionBar) findViewById(R.id.actionbar);
        actionBar.setHomeAction(new IntentAction(this, createIntent(this), R.drawable.icon));
        actionBar.setTitle("Game Controller");
        
        actionBar.addAction(new ActivityManagerAction());

        // Preventing the screen from locking when the activity is active
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    
    /**
     * This is where we will be getting the results from QR code scanner.
     */
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
		if (resultCode == RESULT_OK) {
			IntentResult scanResult = IntentIntegrator.parseActivityResult(
					requestCode, resultCode, intent);
			if (scanResult != null) {
				Log.d(TAG_SCAN, scanResult.getContents());
				String scanContents = scanResult.getContents();
				
				EditText txtURL = (EditText) findViewById(R.id.txtURL);
        		EditText txtToken = (EditText) findViewById(R.id.txtToken);
        		
        		String url = scanContents.substring(0, scanContents.indexOf("|"));
        		url = url.replace("http://", "ws://");
        		url = url.replace("https://", "ws://");
        		if (url.endsWith("/"))
        			url = url.substring(0,  url.length() - 1);
        		txtURL.setText(url);
        		txtToken.setText(scanContents.substring(scanContents.indexOf("|") + 1));
			}
		}
	}
    
    /**
     * Custom Action class to handle close button on the action bar
     * @author Varun
     *
     */
    private class ActivityManagerAction implements Action {

        @Override
        public int getDrawable() {
            return R.drawable.close_icon;
        }

        @Override
        public void performAction(View view) {
        	finish();
        	// TODO: Need to gracefully close the socket thread rather than forcibly killing the app.
        	System.exit(0);
        }

    }
    
    public static Intent createIntent(Context context) {
        Intent i = new Intent(context, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return i;
    }
    
    @Override
	public Object onRetainNonConfigurationInstance() {
		if (mAccessory != null) {
			return mAccessory;
		} else {
			return super.onRetainNonConfigurationInstance();
		}
	}
    
    /**
     * Called when the activity gets back the focus
     */
    @Override
	public void onResume() {
		super.onResume();

		Log.d(TAG, "onResume()");
		if (mInputStream != null && mOutputStream != null) {
			return;
		}

		Log.d(TAG_USB, "Getting accessory list.. ");
		UsbAccessory[] accessories = mUsbManager.getAccessoryList();
		UsbAccessory accessory = (accessories == null ? null : accessories[0]);
		if (accessory != null) {
			Log.d(TAG_USB, "Accessory found");
			if (mUsbManager.hasPermission(accessory)) {
				Log.d(TAG_USB, "Has access");
				openAccessory(accessory);
			} else {
				synchronized (mUsbReceiver) {
					if (!mPermissionRequestPending) {
						mUsbManager.requestPermission(accessory,
								mPermissionIntent);
						mPermissionRequestPending = true;
					}
				}
			}
		} else {
			Log.d(TAG_USB, "Accessory is null");
		}
    }
    
    @Override
	public void onPause() {
		super.onPause();
		Log.d(TAG, "onPause()");
		closeAccessory();
	}

	@Override
	public void onDestroy() {
		unregisterReceiver(mUsbReceiver);
		Log.d(TAG, "onDestroy()");
		super.onDestroy();
	}
    
	/**
	 * Opens the accessory which we have just acquired the permission for reading / writing.
	 * @param accessory
	 */
    private void openAccessory(UsbAccessory accessory) {
		mFileDescriptor = mUsbManager.openAccessory(accessory);
		if (mFileDescriptor != null) {
			mAccessory = accessory;
			FileDescriptor fd = mFileDescriptor.getFileDescriptor();
			mInputStream = new FileInputStream(fd);
			mOutputStream = new FileOutputStream(fd);
			Thread thread = new Thread(null, this, "GameController");
			thread.start();
			Log.d(TAG_USB, "Accessory opened");
		} else {
			Log.d(TAG_USB, "Accessory open fail");
		}
	}

    /**
     * Closes the accessory when the activity loses its focus
     */
	private void closeAccessory() {
		try {
			if (mFileDescriptor != null) {
				mFileDescriptor.close();
			}
		} catch (IOException e) {
		} finally {
			mInputStream = null;
			mOutputStream = null;
			mFileDescriptor = null;
			mAccessory = null;
		}
	}
	
	/**
	 * Reading the data from USB device in a separate thread (as it is a blocking I/O operation).
	 * It just reads the data, wrap the data as JoystickMsg and passes onto the message handler.
	 */
	public void run() {
		int ret = 0;
		byte[] buffer = new byte[16384];
		Log.e(TAG_USB, "Thread started...");
		while (ret >= 0 && mInputStream != null) {
			try {
				ret = mInputStream.read(buffer);
				JoystickMsg msg = new JoystickMsg(buffer[0], buffer[2]);
				if (joystickMsg.equals(msg) == false) {
					Message m = Message.obtain(mHandler, MESSAGE_RENDER_JOYSTICK_DATA);
					m.obj = msg;
					mHandler.sendMessage(m);
				
					m = Message.obtain(mHandler, MESSAGE_PUBLISH_JOYSTICK_DATA);
					m.obj = msg;
					mHandler.sendMessage(m);
					
					joystickMsg = msg;
				}
			} catch (IOException e) {
				break;
			} catch (Exception e) {
			}
		}
		
		Log.e(TAG_USB, "Thread closed...");
	}
	
	/**
	 * Message handler for co-ordinating the different components: reader thread, UI rendering and sockets communication.
	 */
	private Handler mHandler = new Handler() {
		@Override
		public void handleMessage(Message msg) {
			switch (msg.what) {
				case MESSAGE_RENDER_JOYSTICK_DATA:
					updateJoystickData((JoystickMsg) msg.obj);
					break;
				case MESSAGE_PUBLISH_JOYSTICK_DATA:
					postJoystickData((JoystickMsg) msg.obj);
					break;
				case MESSAGE_SOCKET_CONNECTED:
					showToast((String)msg.obj);
					break;
				case MESSAGE_INVALID_TOKEN:
					showToast((String)msg.obj);
					break;
			}
		}
	};
	
	/** 
	 * Utility method for rendering the Joystick data on the screen
	 * @param msg
	 */
	private void updateJoystickData(JoystickMsg msg) {
		lblX.setText("X: " + msg.getX());
		lblY.setText("Y: " + msg.getY());
	}
	
	/**
	 * Utility method for posting the Joystick data to the server via web sockets.
	 * @param msg
	 */
	private void postJoystickData(JoystickMsg msg) {
		Log.d(TAG_SOCKET, String.valueOf(isSocketConnected));
		if (isSocketConnected) {
			try {
				IOMessage m = new IOMessage(IOMessage.EVENT, IOWebSocket.genID(), "", msg.toJSONString());
				socket.getWebSocket().SendMessage(m);
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
	}
	
	/**
	 * Utility method for showing toasts.
	 * @param data
	 */
	private void showToast(String data) {
		Toast toast = Toast.makeText(getApplicationContext(), data, Toast.LENGTH_LONG);
		toast.show();
	}
	
	/**
	 * Model object for holding Joystick data
	 * @author Varun
	 *
	 */
	private class JoystickMsg {
		private int x;
		private int y;

		public JoystickMsg(int x, int y) {
			this.x = x;
			this.y = y;
		}

		public int getX() {
			return x;
		}

		public int getY() {
			return y;
		}
		
		public String toJSONString() {
			StringBuilder json = new StringBuilder("{");
			json.append("\"name\":\"" + EVENT_GAME_EVENT + "\", ");
			json.append("\"args\":[");
			json.append("\"" + token + "\", ");
			json.append("{\"type\": \"joystick\", \"x\": " + x + ", \"y\": " + y + "}");
			//"{\"name\":\"" + EVENT_JOIN + "\",\"args\":[\"" + token + "\", true]}"
			json.append("]}");
			return json.toString();
		}
		
		@Override
		public boolean equals(Object o) {
			JoystickMsg that = (JoystickMsg) o;
			if (this.x == that.x && this.y == that.y)
				return true;
			else
				return false;
		}
	}
}