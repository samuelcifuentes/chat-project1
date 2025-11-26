package com.chat.rpc;

import com.chat.core.ChatRepository;
import com.chat.core.ChatServiceDelegate;
import com.zeroc.Ice.Communicator;
import com.zeroc.Ice.ObjectAdapter;
import com.zeroc.Ice.Util;
import java.nio.file.Paths;

public class ChatServerApp extends com.zeroc.Ice.Application {

    public static void main(String[] args) {
        ensureIceConfig();
        ChatServerApp app = new ChatServerApp();
        int status = app.main("ChatServer", args);
        System.exit(status);
    }

    private static void ensureIceConfig() {
        if (System.getProperty("Ice.Config") == null) {
            String configPath = Paths.get("server", "config", "ice.properties").toAbsolutePath().toString();
            System.setProperty("Ice.Config", configPath);
        }
    }

    @Override
    public int run(String[] args) {
        Communicator communicator = communicator();
        try {
            ChatRepository repository = new ChatRepository();
            ChatServiceDelegate delegate = new ChatServiceDelegate(repository);
            RealtimePushManager pushManager = new RealtimePushManager();

            String endpoints = communicator.getProperties()
                .getPropertyWithDefault("ChatAdapter.Endpoints", "ws -h 0.0.0.0 -p 10000");
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints("ChatAdapter", endpoints);

            ChatSessionI servant = new ChatSessionI(delegate, pushManager);
            adapter.add(servant, Util.stringToIdentity("ChatSession"));
            adapter.activate();

            System.out.println("[ICE] Chat RPC server ready. Press Ctrl+C to stop.");
            communicator.waitForShutdown();
            return 0;
        } catch (Exception ex) {
            ex.printStackTrace();
            return 1;
        }
    }
}

