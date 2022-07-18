import {HWProvider} from "./hwProvider";
import Transport from "ledgerhq__hw-transport";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";

export class NodeHWProvider extends HWProvider {

    async getTransport(): Promise<Transport> {
        return await TransportNodeHid.create();
    }

}