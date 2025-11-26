#include <Ice/BuiltinSequences.ice>

module Chat {
    sequence<string> StringSeq;

    struct UserInfo {
        string id;
        string displayName;
    };

    struct GroupInfo {
        string id;
        string name;
        StringSeq members;
    };

    struct MessagePayload {
        string id;
        string from;
        string fromName;
        string to;
        string toType;
        string kind;
        string text;
        string mediaPath;
        string mimeType;
        long timestamp;
    };

    sequence<MessagePayload> MessagePayloadSeq;

    struct CallEvent {
        string type;
        string from;
        string fromName;
        string targetId;
        string targetType;
    };

    interface RealtimePush {
        void onIncomingMessage(MessagePayload payload);
        void onGroupCreated(GroupInfo group);
        void onCallEvent(CallEvent event);
    };

    interface ChatSession {
        idempotent UserInfo registerUser(string desiredName);
        GroupInfo createGroup(string userId, string name, StringSeq members);
        void sendText(string userId, string toId, string toType, string text);
        void sendAudio(string userId, string toId, string toType, Ice::ByteSeq audioData, string mimeType);
        MessagePayloadSeq getHistory(string userId, string targetId, string targetType);
        void subscribePush(string userId, RealtimePush* client);
        void unsubscribePush(string userId, RealtimePush* client);
        CallEvent startCall(string userId, string targetId, string targetType);
        CallEvent endCall(string userId, string targetId, string targetType);
    };
};

