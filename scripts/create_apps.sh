#!/bin/sh

UUIDGEN="uuidgen"
MONGO="mongo"

DBNAME="myconference-api"
APPCOLL="applications"

WEBAPP="Web-App"
ANDROIDAPP="Android-App"
IOSAPP="iOS-App"

echo "Dropping collection '$APPCOLL'..."
"$MONGO" "$DBNAME" --eval "db.applications.drop()" | sed 's/^/ > /'

for APP in "$WEBAPP" "$ANDROIDAPP" "$IOSAPP"; do
  APPID="$("$UUIDGEN")"
  echo "Saving application '$APP' with id '$APPID'..."
  "$MONGO" "$DBNAME" --eval "db.$APPCOLL.save({'name':'$APP', '_id':'$APPID'})" | sed 's/^/ > /'
done
