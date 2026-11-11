import { act, render, screen, waitFor } from "@testing-library/react";
import { WalletProvider, useWallet } from "@/hooks/useWallet";
import { accountExists } from "@/lib/stellar/horizon";
import {
  connectWallet,
  disconnectWallet,
  getAvailableWallets,
  getConnectedAddress,
} from "@/lib/stellar/wallet";

jest.mock("@/lib/stellar/horizon", () => ({
  accountExists: jest.fn(),
  fundWithFriendbot: jest.fn(),
  getNativeBalance: jest.fn(),
}));

jest.mock("@/lib/stellar/wallet", () => ({
  classifyConnectError: jest.fn(() => "Failed to connect wallet."),
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  getAvailableWallets: jest.fn(),
  getConnectedAddress: jest.fn(),
}));

const ADDRESS = "GDJIN6W6PLTPKLLM57UW65ZH4BITUXUMYQHIMAZFYXF45PZVAWDBI77Z";

/**
 * A consumer of the wallet context, standing in for the navigation bar and
 * the wallet button: both read the same shared state.
 */
function WalletProbe({ label }: { label: string }) {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useWallet();

  return (
    <div>
      <span data-testid={`${label}-address`}>{address ?? "none"}</span>
      <span data-testid={`${label}-connected`}>{String(isConnected)}</span>
      <span data-testid={`${label}-connecting`}>{String(isConnecting)}</span>
      <span data-testid={`${label}-error`}>{error ?? "none"}</span>
      <button onClick={() => void connect()}>connect {label}</button>
      <button onClick={() => void disconnect()}>disconnect {label}</button>
    </div>
  );
}

function renderProbes() {
  return render(
    <WalletProvider>
      <WalletProbe label="navbar" />
      <WalletProbe label="button" />
    </WalletProvider>,
  );
}

describe("wallet state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    (getAvailableWallets as unknown as jest.Mock).mockResolvedValue([
      { id: "freighter", name: "Freighter" },
    ]);
    (connectWallet as unknown as jest.Mock).mockResolvedValue(ADDRESS);
    (disconnectWallet as unknown as jest.Mock).mockResolvedValue(undefined);
    (getConnectedAddress as unknown as jest.Mock).mockResolvedValue(null);
    // The balance lookup is best-effort; failing it keeps these tests focused
    // on the connection state.
    (accountExists as unknown as jest.Mock).mockRejectedValue(
      new Error("offline"),
    );
  });

  it("shares one connection state between consumers", async () => {
    renderProbes();

    expect(screen.getByTestId("navbar-connected")).toHaveTextContent("false");
    expect(screen.getByTestId("button-connected")).toHaveTextContent("false");

    await act(async () => {
      screen.getByRole("button", { name: "connect navbar" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("navbar-connected")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("button-connected")).toHaveTextContent("true");
    expect(screen.getByTestId("navbar-address")).toHaveTextContent(ADDRESS);
    expect(screen.getByTestId("button-address")).toHaveTextContent(ADDRESS);
  });

  it("disconnects every consumer at once", async () => {
    renderProbes();

    await act(async () => {
      screen.getByRole("button", { name: "connect navbar" }).click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("navbar-connected")).toHaveTextContent("true"),
    );

    await act(async () => {
      screen.getByRole("button", { name: "disconnect button" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("navbar-connected")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("button-connected")).toHaveTextContent("false");
    expect(screen.getByTestId("navbar-address")).toHaveTextContent("none");
    expect(screen.getByTestId("button-address")).toHaveTextContent("none");
  });

  it("drops a connect that resolves after a disconnect", async () => {
    let resolveConnect: (address: string) => void = () => {};
    (connectWallet as unknown as jest.Mock).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveConnect = resolve;
        }),
    );

    renderProbes();

    await act(async () => {
      screen.getByRole("button", { name: "connect navbar" }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "disconnect navbar" }).click();
    });

    // The wallet modal only resolves now, after the user already left.
    await act(async () => {
      resolveConnect(ADDRESS);
      await Promise.resolve();
    });

    expect(screen.getByTestId("navbar-connected")).toHaveTextContent("false");
    expect(screen.getByTestId("button-connected")).toHaveTextContent("false");
    expect(screen.getByTestId("navbar-address")).toHaveTextContent("none");
  });

  it("survives rapid connect and disconnect cycles", async () => {
    renderProbes();

    for (let cycle = 0; cycle < 3; cycle++) {
      await act(async () => {
        screen.getByRole("button", { name: "connect navbar" }).click();
      });
      await act(async () => {
        screen.getByRole("button", { name: "disconnect navbar" }).click();
      });
    }

    expect(screen.getByTestId("navbar-connected")).toHaveTextContent("false");
    expect(screen.getByTestId("button-connected")).toHaveTextContent("false");
    expect(screen.getByTestId("navbar-address")).toHaveTextContent("none");
    expect(screen.getByTestId("button-address")).toHaveTextContent("none");
  });

  it("reports a missing wallet without opening the selection modal", async () => {
    (getAvailableWallets as jest.Mock).mockResolvedValue([]);

    renderProbes();

    await act(async () => {
      screen.getByRole("button", { name: "connect navbar" }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("navbar-error")).toHaveTextContent(
        "Wallet not installed",
      ),
    );
    expect(connectWallet).not.toHaveBeenCalled();
    expect(screen.getByTestId("navbar-connected")).toHaveTextContent("false");
  });
});
