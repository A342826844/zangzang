import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Toast from "react-native-toast-message";

import { showAddModalAtom, Cookie } from "./common";

import { importCookie } from "@/api";
import { cookiesAtom } from "@/atoms/index";
import Modal from "@/components/Modal";
import Picker from "@/components/Picker";
import { Button, Text, useThemeColor, View, TextInput } from "@/components/Themed";
import Errors from "@/constants/Errors";

export default function AddCookieModal(props: { cookie?: Cookie }) {
  const [visible, setVisible] = useAtom(showAddModalAtom);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [master, setMaster] = useState("");
  const [cookies, setCookies] = useAtom<Cookie[], Cookie[], void>(cookiesAtom);
  const tintColor = useThemeColor({}, "tint");
  const close = () => {
    setName("");
    setCode("");
    setVisible(false);
  };
  const confirm = async () => {
    if (props.cookie) {
      const { id } = (props.cookie || {}) as Cookie;
      const oldCookie = cookies.find((cookie) => cookie.id === id);
      setCookies([
        ...cookies.filter((cookie) => cookie.id !== id),
        {
          ...(oldCookie as Cookie),
          name: name || id,
        },
      ]);
      close();
      return;
    }
    const [id, hash] = code.split("#");
    const validated = id?.length === 8 && hash?.length === 32;
    if (validated) {
      const masterCookie = cookies.find((cookie) => cookie.id === master);
      const masterCode = masterCookie ? `${masterCookie?.id}#${masterCookie?.hash}` : "0";
      const {
        data: { info, code },
      } = await importCookie(masterCode, `${id}#${hash}`);

      if (code === 3104) {
        let newCookies: Cookie[];
        if (master) {
          newCookies = info
            ?.filter((cookie) => cookie.cookie === id)
            ?.map(({ cookie, remarks }) => ({
              id: cookie,
              name: name || remarks || cookie,
              hash,
              code: `${masterCode}#${cookie}`,
              master,
            }));
        } else {
          newCookies = info.map(({ cookie, remarks }) => ({
            id: cookie,
            name: cookie === id ? name || remarks || cookie : cookie,
            hash,
            code: `${id}#${hash}#${cookie}`,
            master: cookie === id ? "" : id,
          }));
        }
        setCookies([
          ...cookies.filter(
            (cookie) => !newCookies.find((newCookie) => newCookie.id === cookie.id)
          ),
          ...newCookies,
        ]);
        Toast.show({
          type: "success",
          text1: "????????????",
        });
      } else {
        Toast.show({
          type: "error",
          text1: Errors[code] || info.toString() || "?????????",
        });
      }
    } else {
      Toast.show({
        type: "error",
        text1: "?????????????????????",
        text2: "8?????????#32?????????",
      });
    }
    close();
  };

  useEffect(() => {
    if (props.cookie) {
      setName(props.cookie.name);
      setMaster(props.cookie.master);
    }
  }, [props.cookie]);

  return (
    <Modal isVisible={visible} onBackdropPress={close} avoidKeyboard>
      <View style={styles.modal}>
        <Text style={styles.title}>{props.cookie ? "????????????" : "????????????"}</Text>
        <TextInput
          placeholder="????????????????????????"
          value={name}
          onChangeText={(val) => setName(val)}
          style={styles.input}
        />
        {!props.cookie?.hash && (
          <TextInput
            placeholder="????????????"
            value={code}
            onChangeText={(val) => setCode(val)}
            style={styles.input}
          />
        )}
        <View style={styles.pickerWrapper}>
          <Text style={{ ...styles.pickerLabel, color: tintColor }}>?????????</Text>
          <Picker
            selectedValue={master}
            onValueChange={(val: string) => setMaster(val)}
            options={[
              { label: "???", value: "" },
              ...cookies
                ?.filter((cookie) => cookie.id && !cookie.master)
                ?.map((cookie: any) => ({ label: cookie.name, value: cookie.id })),
            ]}
          />
        </View>
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button title="??????" onPress={close} />
          </View>
          <View style={styles.footerButton}>
            <Button title="??????" onPress={confirm} disabled={!(code || props.cookie?.code)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
  },
  modal: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  input: {
    margin: 2,
    marginBottom: 10,
    padding: 5,
    borderRadius: 5,
    overflow: "hidden",
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    alignSelf: "flex-end",
    paddingVertical: 10,
  },
  footerButton: {
    marginLeft: 20,
  },
  picker: {
    flex: 1,
  },
  pickerWrapper: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  pickerLabel: {
    width: "30%",
  },
});
