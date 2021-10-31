domain=""
[ "$domain" = "" ] && { echo "please edit this script and put your CF Worker domain here" ; exit 1 ; }

curl -0 -X POST https://$domain/fn \
-H "Expect:" \
-H 'Content-Type: application/json; charset=utf-8' \
--data-binary @- << EOF
{
    "code": "((incoming, api) => { \
        let x = 1; \
        return x + api.tomlParse('a=1').a + incoming.a \
    })",
    "data": {
        "a": 10
    }
}
EOF
