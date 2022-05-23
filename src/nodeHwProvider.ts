import {HWProvider} from "./hwProvider";
import Transport from "ledgerhq__hw-transport";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";

export class NodeHwProvider extends HWProvider {

    async getTransport(): Promise<Transport> {
        return await TransportNodeHid.create();
    }

}