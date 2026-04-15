"use client";

import { gql, NetworkStatus } from "@apollo/client";
import { ApolloProvider, useMutation, useQuery } from "@apollo/client/react";
import { useState, useEffect } from "react";
import { graphqlClient } from "@/lib/graphql-client";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const USERS_QUERY = gql`
  query {
    users {
      id
      name
    }
  }
`;

const USER_QUERY = gql`
  query User($id: Int!) {
    user(id: $id) {
      id
      name
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(createUserInput: $input) {
      id
      name
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(updateUserInput: $input) {
      id
      name
    }
  }
`;

const REMOVE_USER = gql`
  mutation RemoveUser($id: Int!) {
    removeUser(id: $id) {
      id
    }
  }
`;

type User = {
  id: number;
  name: string;
};

function UsersPageContent() {
  const { data, loading, error, refetch, networkStatus } = useQuery<{ users: User[] }>(USERS_QUERY, {
    notifyOnNetworkStatusChange: true,
  });

  const [selectedId, setSelectedId] = useState<number>(1);
  const [name, setName] = useState("");

  // Single user query
  const { data: oneUserData, refetch: refetchOne, loading: loadingUser } = useQuery<{ user: User }>(
    USER_QUERY,
    { variables: { id: selectedId } }
  );

  // Mutations with automatic refetch
  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: USERS_QUERY }],
  });

  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, {
    refetchQueries: [{ query: USERS_QUERY }],
  });

  const [removeUser, { loading: removing }] = useMutation(REMOVE_USER, {
    refetchQueries: [{ query: USERS_QUERY }],
  });

  // Auto fetch single user when ID changes
  useEffect(() => {
    refetchOne();
  }, [selectedId, refetchOne]);

  const isInitialLoading = loading && !data;
  const isRefetching = networkStatus === NetworkStatus.refetch;

  if (isInitialLoading) return <p className="p-8">Loading users...</p>;
  if (error) return <p className="p-8 text-destructive">Error: {error.message}</p>;

  return (
    <main className="min-h-screen bg-background p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">User GraphQL Demo</h1>
        <p className="text-muted-foreground mt-2">Apollo Client + shadcn/ui • Real-time updates</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* All Users - Left Side */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Live list • Updates automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {data?.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between bg-muted/60 hover:bg-muted px-5 py-3 rounded-xl transition-colors"
                  >
                    <div>
                      <span className="font-mono text-sm text-muted-foreground">#{u.id}</span>{" "}
                      <span className="font-medium text-lg">{u.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedId(u.id)}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isRefetching}>
                {isRefetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRefetching ? "Refreshing..." : "Refresh List"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Single User + CRUD */}
        <div className="lg:col-span-2 space-y-6 w-full min-w-[24rem]">
          {/* Get One User */}
          <Card>
            <CardHeader>
              <CardTitle>Get One User</CardTitle>
              <CardDescription>Query by ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 ">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="number"
                  value={selectedId}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Result</Label>
                <pre className="mt-2 bg-muted p-5 rounded-2xl text-sm overflow-auto min-h-[9rem]">
                  {loadingUser
                    ? "Loading..."
                    : JSON.stringify(oneUserData?.user ?? null, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* CRUD Operations */}
          <Card >
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>Create, Update, Delete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={async () => {
                    await createUser({ variables: { input: { name } } });
                    setName("");
                  }}
                  disabled={creating || !name.trim()}
                  className="w-full"
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateUser({
                      variables: { input: { id: selectedId, name } },
                    });
                  }}
                  disabled={updating || !name.trim()}
                  className="w-full"
                >
                  {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update User #{selectedId}
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (confirm(`Delete user #${selectedId}?`)) {
                      await removeUser({ variables: { id: selectedId } });
                    }
                  }}
                  disabled={removing}
                  className="w-full"
                >
                  {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete User #{selectedId}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <ApolloProvider client={graphqlClient}>
      <UsersPageContent />
    </ApolloProvider>
  );
}